import { prisma } from '../../lib/prisma.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Role, FormStatus, FormVisibility, FormType, Prisma } from '@prisma/client';
export class FormService {
    /**
     * ดึงรายการฟอร์มที่ผู้ใช้มีสิทธิ์เข้าถึง (สำหรับหน้าจัดการฟอร์ม หรือ ถังขยะ)
     */
    static async getForms(userId, userRole, userDeptId, isTrash = false) {
        const where = {};
        if (isTrash) {
            where.deletedAt = { not: null };
            if (userRole !== Role.ADMIN) {
                where.ownerId = userId;
            }
        }
        else {
            where.deletedAt = null;
            if (userRole !== Role.ADMIN) {
                where.OR = [
                    { ownerId: userId },
                    { visibility: FormVisibility.PUBLIC },
                    ...(userDeptId
                        ? [
                            {
                                visibility: FormVisibility.DEPARTMENT,
                                departmentId: userDeptId,
                            },
                        ]
                        : []),
                    {
                        visibility: FormVisibility.PRIVATE,
                        shares: {
                            some: { userId },
                        },
                    },
                ];
            }
        }
        const forms = await prisma.form.findMany({
            where,
            include: {
                owner: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                versions: {
                    orderBy: { version: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        version: true,
                        _count: {
                            select: { submissions: true },
                        },
                    },
                },
                _count: {
                    select: {
                        shares: true,
                        assignments: true,
                    },
                },
            },
            orderBy: isTrash ? { deletedAt: 'desc' } : { updatedAt: 'desc' },
        });
        const screeningCount = await prisma.childScreeningRecord.count().catch(() => 0);
        return forms.map((f) => {
            const latestVersion = f.versions[0] || null;
            const isSuite = f.id === 'form_child_screening_suite';
            return {
                ...f,
                latestVersionNumber: latestVersion?.version ?? 1,
                latestVersionId: latestVersion?.id ?? null,
                submissionsCount: isSuite ? screeningCount : (latestVersion?._count.submissions ?? 0),
                isOwner: f.ownerId === userId || userRole === Role.ADMIN,
            };
        });
    }
    /**
     * ดึงรายการฟอร์มที่อยู่ในถังขยะ
     */
    static async getTrash(userId, userRole) {
        return this.getForms(userId, userRole, null, true);
    }
    /**
     * ดึงจำนวนแบบฟอร์มในถังขยะ
     */
    static async getTrashCount(userId, userRole) {
        const where = {
            deletedAt: { not: null },
            ...(userRole !== Role.ADMIN ? { ownerId: userId } : {}),
        };
        return prisma.form.count({ where });
    }
    /**
     * ดึงฟอร์มตาม ID (พร้อมตรวจสอบสิทธิ์การเข้าถึง)
     */
    static async getById(formId, userId, userRole, userDeptId, forEditing = false) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                owner: {
                    select: { id: true, fullName: true, username: true },
                },
                department: {
                    select: { id: true, name: true },
                },
                shares: {
                    include: {
                        user: { select: { id: true, fullName: true, username: true } },
                    },
                },
                versions: {
                    orderBy: { version: 'desc' },
                },
            },
        });
        if (!form) {
            throw new Error('ไม่พบแบบฟอร์มที่ระบุ');
        }
        if (form.deletedAt) {
            throw new Error('แบบฟอร์มนี้อยู่ในถังขยะ กรุณากู้คืนก่อนเปิดใช้งาน');
        }
        const isOwner = userId ? (form.ownerId === userId || userRole === Role.ADMIN) : false;
        // ถ้าเปิดเพื่อแก้ไข ต้องเป็นเจ้าของหรือ ADMIN เท่านั้น
        if (forEditing && !isOwner) {
            throw new Error('คุณไม่มีสิทธิ์แก้ไขแบบฟอร์มนี้ (เฉพาะเจ้าของฟอร์มหรือผู้ดูแลระบบ)');
        }
        // ตรวจสอบสิทธิ์การมองเห็น (Visibility) และเงื่อนไขการ Login
        if (!isOwner) {
            if (form.requireLogin && !userId) {
                throw new Error('แบบฟอร์มนี้กำหนดให้เข้าสู่ระบบก่อนตอบ (Authentication Required)');
            }
            if (form.visibility === FormVisibility.PRIVATE) {
                if (!userId) {
                    throw new Error('แบบฟอร์มนี้เป็นแบบส่วนบุคคล (Private) กำหนดให้เข้าสู่ระบบก่อน');
                }
                const isShared = form.shares.some((s) => s.userId === userId);
                if (!isShared) {
                    throw new Error('แบบฟอร์มนี้เป็นแบบส่วนบุคคล (Private) และยังไม่ได้รับการแชร์ให้คุณ');
                }
            }
            else if (form.visibility === FormVisibility.DEPARTMENT) {
                if (!userId || !userDeptId || form.departmentId !== userDeptId) {
                    throw new Error('แบบฟอร์มนี้สงวนสิทธิ์เฉพาะสมาชิกในแผนกเท่านั้น');
                }
            }
        }
        const latestVersion = form.versions[0];
        let schema = latestVersion?.schema || [];
        // กฎสำคัญด้านความปลอดภัย: ถ้าไม่ใช่เจ้าของฟอร์ม ห้ามส่งเฉลย (correctAnswer) ไปให้ client
        if (!isOwner) {
            schema = schema.map((field) => {
                const { correctAnswer, ...safeField } = field;
                return safeField;
            });
        }
        return {
            ...form,
            schema,
            scoreConfig: latestVersion?.scoreConfig || null,
            currentVersionNumber: latestVersion?.version || 1,
            currentVersionId: latestVersion?.id || null,
            isOwner,
        };
    }
    /**
     * สร้างแบบฟอร์มใหม่
     */
    static async create(input, ownerId, meta) {
        const form = await prisma.form.create({
            data: {
                title: input.title,
                description: input.description,
                type: input.type,
                visibility: input.visibility,
                departmentId: input.departmentId || null,
                ownerId,
                status: FormStatus.DRAFT,
                isAcceptingResponses: input.isAcceptingResponses ?? true,
                requireLogin: input.requireLogin ?? true,
                pdpaEnabled: input.pdpaEnabled ?? true,
                pdpaTitle: input.pdpaTitle || null,
                pdpaContent: input.pdpaContent || null,
                openAt: input.openAt ? new Date(input.openAt) : null,
                closeAt: input.closeAt ? new Date(input.closeAt) : null,
                allowMultiple: input.allowMultiple ?? true,
                maxAttempts: input.maxAttempts || null,
                versions: {
                    create: {
                        version: 1,
                        schema: input.schema,
                        scoreConfig: input.scoreConfig || Prisma.JsonNull,
                    },
                },
            },
            include: {
                versions: true,
            },
        });
        await createAuditLog({
            userId: ownerId,
            action: 'FORM_CREATE',
            entity: 'Form',
            entityId: form.id,
            meta: {
                title: form.title,
                type: form.type,
                visibility: form.visibility,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return form;
    }
    /**
     * อัปเดตแบบฟอร์ม (บันทึกร่าง)
     */
    static async update(formId, input, userId, userRole, meta) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์แก้ไขแบบฟอร์มนี้');
        }
        const latestVersion = form.versions[0];
        // อัปเดตข้อมูล Form
        const updatedForm = await prisma.form.update({
            where: { id: formId },
            data: {
                title: input.title,
                description: input.description,
                type: input.type,
                visibility: input.visibility,
                departmentId: input.departmentId !== undefined ? input.departmentId : form.departmentId,
                requireLogin: input.requireLogin !== undefined ? input.requireLogin : form.requireLogin,
                pdpaEnabled: input.pdpaEnabled !== undefined ? input.pdpaEnabled : form.pdpaEnabled,
                pdpaTitle: input.pdpaTitle !== undefined ? input.pdpaTitle : form.pdpaTitle,
                pdpaContent: input.pdpaContent !== undefined ? input.pdpaContent : form.pdpaContent,
            },
        });
        // อัปเดตร่างของ Version ปัจจุบันหากยังเป็น Draft หรือยังไม่มีผลสอบ
        if (latestVersion && input.schema) {
            await prisma.formVersion.update({
                where: { id: latestVersion.id },
                data: {
                    schema: input.schema,
                    scoreConfig: input.scoreConfig || latestVersion.scoreConfig || Prisma.JsonNull,
                },
            });
        }
        await createAuditLog({
            userId,
            action: 'FORM_UPDATE',
            entity: 'Form',
            entityId: formId,
            meta: { title: updatedForm.title },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return updatedForm;
    }
    /**
     * เผยแพร่แบบฟอร์ม (Publish Form) พร้อมระบบ Versioning
     */
    static async publish(formId, input, userId, userRole, meta) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    include: {
                        _count: { select: { submissions: true } },
                    },
                },
            },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์เผยแพร่แบบฟอร์มนี้');
        }
        const latestVersion = form.versions[0];
        let newVersionNumber = 1;
        // กฎสถาปัตยกรรม Versioning:
        // ถ้าเคยเป็น Draft และยังไม่มีใครส่งคำตอบเลย สามารถอัปเดตทับ v1 ได้
        // แต่ถ้ามีคนส่งคำตอบแล้ว หรือเคย publish ไปแล้ว -> ให้สร้าง Version ใหม่ (latest + 1)
        if (latestVersion) {
            if (form.status === FormStatus.DRAFT && latestVersion._count.submissions === 0) {
                await prisma.formVersion.update({
                    where: { id: latestVersion.id },
                    data: {
                        schema: input.schema,
                        scoreConfig: input.scoreConfig || Prisma.JsonNull,
                    },
                });
                newVersionNumber = latestVersion.version;
            }
            else {
                newVersionNumber = latestVersion.version + 1;
                await prisma.formVersion.create({
                    data: {
                        formId: form.id,
                        version: newVersionNumber,
                        schema: input.schema,
                        scoreConfig: input.scoreConfig || Prisma.JsonNull,
                    },
                });
            }
        }
        // เปลี่ยนสถานะเป็น PUBLISHED
        const publishedForm = await prisma.form.update({
            where: { id: formId },
            data: {
                status: FormStatus.PUBLISHED,
                isAcceptingResponses: true,
            },
        });
        await createAuditLog({
            userId,
            action: 'FORM_PUBLISH',
            entity: 'Form',
            entityId: formId,
            meta: {
                title: publishedForm.title,
                version: newVersionNumber,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return {
            form: publishedForm,
            version: newVersionNumber,
        };
    }
    /**
     * ปรับตั้งค่าฟอร์ม (เปิด-ปิดรับคำตอบ, ช่วงเวลา, ครั้งที่ทำได้)
     */
    static async updateSettings(formId, input, userId, userRole, meta) {
        const form = await prisma.form.findUnique({ where: { id: formId } });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์แก้ไขการตั้งค่าแบบฟอร์มนี้');
        }
        const updated = await prisma.form.update({
            where: { id: formId },
            data: {
                isAcceptingResponses: input.isAcceptingResponses !== undefined ? input.isAcceptingResponses : form.isAcceptingResponses,
                openAt: input.openAt !== undefined ? (input.openAt ? new Date(input.openAt) : null) : form.openAt,
                closeAt: input.closeAt !== undefined ? (input.closeAt ? new Date(input.closeAt) : null) : form.closeAt,
                allowMultiple: input.allowMultiple !== undefined ? input.allowMultiple : form.allowMultiple,
                maxAttempts: input.maxAttempts !== undefined ? input.maxAttempts : form.maxAttempts,
                visibility: input.visibility !== undefined ? input.visibility : form.visibility,
                departmentId: input.departmentId !== undefined ? input.departmentId : form.departmentId,
                requireLogin: input.requireLogin !== undefined ? input.requireLogin : form.requireLogin,
                pdpaEnabled: input.pdpaEnabled !== undefined ? input.pdpaEnabled : form.pdpaEnabled,
                pdpaTitle: input.pdpaTitle !== undefined ? input.pdpaTitle : form.pdpaTitle,
                pdpaContent: input.pdpaContent !== undefined ? input.pdpaContent : form.pdpaContent,
            },
        });
        await createAuditLog({
            userId,
            action: 'FORM_SETTINGS_UPDATE',
            entity: 'Form',
            entityId: formId,
            meta: {
                isAcceptingResponses: updated.isAcceptingResponses,
                openAt: updated.openAt,
                closeAt: updated.closeAt,
                allowMultiple: updated.allowMultiple,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return updated;
    }
    /**
     * แชร์ฟอร์มส่วนบุคคล (FormShare)
     */
    static async shareForm(formId, targetUserIds, userId, userRole, meta) {
        const form = await prisma.form.findUnique({ where: { id: formId } });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์แชร์แบบฟอร์มนี้');
        }
        // ลบการแชร์เดิมและสร้างชุดใหม่
        await prisma.$transaction([
            prisma.formShare.deleteMany({ where: { formId } }),
            prisma.formShare.createMany({
                data: targetUserIds.map((uId) => ({
                    formId,
                    userId: uId,
                })),
                skipDuplicates: true,
            }),
        ]);
        await createAuditLog({
            userId,
            action: 'FORM_SHARE',
            entity: 'Form',
            entityId: formId,
            meta: {
                sharedUserCount: targetUserIds.length,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return { success: true, count: targetUserIds.length };
    }
    /**
     * ย้ายแบบฟอร์มไปไว้ในถังขยะ (Soft Delete)
     */
    static async moveToTrash(formId, userId, userRole, meta) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์ย้ายแบบฟอร์มนี้ไปที่ถังขยะ');
        }
        if (form.deletedAt) {
            return {
                action: 'trashed',
                message: `แบบฟอร์ม "${form.title}" อยู่ในถังขยะอยู่แล้ว`,
            };
        }
        await prisma.form.update({
            where: { id: formId },
            data: {
                deletedAt: new Date(),
                isAcceptingResponses: false,
            },
        });
        await createAuditLog({
            userId,
            action: 'FORM_MOVE_TO_TRASH',
            entity: 'Form',
            entityId: formId,
            meta: { title: form.title },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return {
            action: 'trashed',
            message: `ย้ายแบบฟอร์ม "${form.title}" ไปไว้ในถังขยะเรียบร้อยแล้ว`,
        };
    }
    /**
     * กู้คืนแบบฟอร์มจากถังขยะ (Restore Form)
     */
    static async restore(formId, userId, userRole, meta) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์กู้คืนแบบฟอร์มนี้');
        }
        if (!form.deletedAt) {
            return {
                action: 'active',
                message: `แบบฟอร์ม "${form.title}" ไม่ได้อยู่ในถังขยะ`,
            };
        }
        await prisma.form.update({
            where: { id: formId },
            data: {
                deletedAt: null,
            },
        });
        await createAuditLog({
            userId,
            action: 'FORM_RESTORE',
            entity: 'Form',
            entityId: formId,
            meta: { title: form.title },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return {
            action: 'restored',
            message: `กู้คืนแบบฟอร์ม "${form.title}" กลับมาใช้งานเรียบร้อยแล้ว`,
        };
    }
    /**
     * ลบแบบฟอร์มอย่างถาวร (Permanent Hard Delete)
     */
    static async deletePermanently(formId, userId, userRole, meta) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์ลบแบบฟอร์มนี้อย่างถาวร');
        }
        await prisma.form.delete({
            where: { id: formId },
        });
        await createAuditLog({
            userId,
            action: 'FORM_PERMANENT_DELETE',
            entity: 'Form',
            entityId: formId,
            meta: { title: form.title },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return {
            action: 'deleted_permanently',
            message: `ลบแบบฟอร์ม "${form.title}" ออกจากระบบอย่างถาวรแล้ว`,
        };
    }
    /**
     * ล้างถังขยะทั้งหมด (Empty Trash)
     */
    static async emptyTrash(userId, userRole, meta) {
        const where = {
            deletedAt: { not: null },
            ...(userRole !== Role.ADMIN ? { ownerId: userId } : {}),
        };
        const count = await prisma.form.count({ where });
        if (count === 0) {
            return { count: 0, message: 'ไม่มีแบบฟอร์มในถังขยะ' };
        }
        await prisma.form.deleteMany({ where });
        await createAuditLog({
            userId,
            action: 'FORM_EMPTY_TRASH',
            entity: 'Form',
            meta: { deletedCount: count },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return {
            count,
            message: `ล้างถังขยะเรียบร้อยแล้ว ลบทั้งหมด ${count} รายการ`,
        };
    }
    /**
     * ลบหรือระงับแบบฟอร์ม (ส่งไปถังขยะ)
     */
    static async delete(formId, userId, userRole, meta) {
        return this.moveToTrash(formId, userId, userRole, meta);
    }
    /**
     * ส่งคำตอบแบบฟอร์ม (Form Submission) พร้อมคำนวณคะแนนอัตโนมัติที่ Backend
     */
    static async submit(formId, answers, userId, userRole, userDeptId, meta, pdpaConsent = false) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                shares: true,
                versions: {
                    orderBy: { version: 'desc' },
                    take: 1,
                },
            },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์มที่ระบุ');
        if (form.deletedAt) {
            throw new Error('ไม่สามารถส่งคำตอบได้ เนื่องจากแบบฟอร์มนี้อยู่ในถังขยะ');
        }
        // 1. ตรวจสอบสถานะฟอร์ม
        if (form.status !== FormStatus.PUBLISHED) {
            throw new Error('แบบฟอร์มนี้ยังไม่ได้เผยแพร่ ไม่สามารถส่งคำตอบได้');
        }
        if (!form.isAcceptingResponses) {
            throw new Error('แบบฟอร์มนี้ปิดรับคำตอบแล้ว');
        }
        const now = new Date();
        if (form.openAt && now < form.openAt) {
            throw new Error(`แบบฟอร์มจะเปิดรับคำตอบในวันที่ ${form.openAt.toLocaleString('th-TH')}`);
        }
        if (form.closeAt && now > form.closeAt) {
            throw new Error(`แบบฟอร์มปิดรับคำตอบแล้วเมื่อวันที่ ${form.closeAt.toLocaleString('th-TH')}`);
        }
        // 2. ตรวจสอบสิทธิ์การเข้าถึง (Visibility) และข้อกำหนดการ Login
        const isOwner = userId ? (form.ownerId === userId || userRole === Role.ADMIN) : false;
        if (!isOwner) {
            if (form.requireLogin && !userId) {
                throw new Error('แบบฟอร์มนี้กำหนดให้เข้าสู่ระบบก่อนตอบ (Authentication Required)');
            }
            if (form.visibility === FormVisibility.PRIVATE) {
                if (!userId) {
                    throw new Error('แบบฟอร์มนี้เป็นแบบส่วนบุคคล (Private) กำหนดให้เข้าสู่ระบบก่อน');
                }
                const isShared = form.shares.some((s) => s.userId === userId);
                if (!isShared) {
                    throw new Error('คุณไม่มีสิทธิ์ส่งคำตอบในแบบฟอร์มส่วนบุคคลนี้');
                }
            }
            else if (form.visibility === FormVisibility.DEPARTMENT) {
                if (!userId || !userDeptId || form.departmentId !== userDeptId) {
                    throw new Error('แบบฟอร์มนี้สงวนสิทธิ์เฉพาะสมาชิกในแผนกเท่านั้น');
                }
            }
        }
        // 3. ตรวจสอบจำนวนครั้งที่อนุญาตให้ส่ง (Attempts) - ตรวจสอบเฉพาะกรณีล็อกอิน
        if (userId) {
            const previousSubmissionsCount = await prisma.submission.count({
                where: {
                    userId,
                    formVersion: { formId },
                },
            });
            if (!form.allowMultiple && previousSubmissionsCount >= 1) {
                throw new Error('คุณได้ส่งคำตอบแบบฟอร์มนี้แล้ว และแบบฟอร์มนี้ไม่อนุญาตให้ทำซ้ำ');
            }
            if (form.maxAttempts && previousSubmissionsCount >= form.maxAttempts) {
                throw new Error(`คุณส่งคำตอบครบจำนวนครั้งที่กำหนดแล้ว (${form.maxAttempts} ครั้ง)`);
            }
        }
        const latestVersion = form.versions[0];
        if (!latestVersion) {
            throw new Error('ไม่พบเวอร์ชันของแบบฟอร์ม');
        }
        const schema = latestVersion.schema || [];
        const scoreConfig = latestVersion.scoreConfig || null;
        // 4. ตรวจสอบข้อคำถามที่จำเป็น (Required Fields)
        for (const field of schema) {
            if (field.type === 'layer_box')
                continue;
            if (field.required) {
                const val = answers[field.id];
                if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                    throw new Error(`กรุณาตอบคำถามในข้อที่จำเป็น: "${field.label}"`);
                }
            }
        }
        // 5. คำนวณคะแนนอัตโนมัติฝั่ง Backend (สำหรับ SCORE_TEST)
        const isScoreTest = form.type === FormType.SCORE_TEST;
        let totalScore = null;
        let maxScore = null;
        let passed = null;
        let grade = null;
        const flaggedFieldIds = [];
        if (isScoreTest) {
            let earned = 0;
            let totalPoints = 0;
            for (const field of schema) {
                if (field.type === 'layer_box')
                    continue;
                const points = field.points ?? 0;
                if (points > 0) {
                    totalPoints += points;
                    const userAns = answers[field.id];
                    const correctAns = field.correctAnswer;
                    if (correctAns !== undefined && correctAns !== null && userAns !== undefined && userAns !== null) {
                        let isCorrect = false;
                        if (field.type === 'number') {
                            isCorrect = Number(userAns) === Number(correctAns);
                        }
                        else if (field.type === 'text') {
                            isCorrect = String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
                        }
                        else if (field.type === 'single_choice' || field.type === 'dropdown') {
                            const optList = field.options || [];
                            const userOpt = optList.find((o) => o.id === userAns || o.label === userAns);
                            const userLabel = userOpt ? userOpt.label : String(userAns);
                            const userId = userOpt ? userOpt.id : String(userAns);
                            const correctOpt = optList.find((o) => o.id === correctAns || o.label === correctAns);
                            const correctLabel = correctOpt ? correctOpt.label : String(correctAns);
                            const correctId = correctOpt ? correctOpt.id : String(correctAns);
                            isCorrect = String(userAns) === String(correctAns) || userLabel === correctLabel || userId === correctId;
                        }
                        else if (field.type === 'multi_choice') {
                            if (Array.isArray(userAns) && Array.isArray(correctAns)) {
                                const optList = field.options || [];
                                const normalizeVal = (val) => {
                                    const opt = optList.find((o) => o.id === val || o.label === val);
                                    return opt ? opt.label : val;
                                };
                                const sortedUser = [...userAns].map(normalizeVal).sort();
                                const sortedCorrect = [...correctAns].map(normalizeVal).sort();
                                isCorrect =
                                    sortedUser.length === sortedCorrect.length &&
                                        sortedUser.every((v, i) => v === sortedCorrect[i]);
                            }
                        }
                        else if (field.type === 'rating') {
                            isCorrect = Number(userAns) === Number(correctAns);
                        }
                        else if (field.type === 'date') {
                            isCorrect = String(userAns).trim() === String(correctAns).trim();
                        }
                        if (isCorrect) {
                            earned += points;
                            flaggedFieldIds.push(field.id);
                        }
                    }
                }
            }
            totalScore = earned;
            maxScore = totalPoints;
            const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 100;
            const passThreshold = scoreConfig?.passScore ?? 50;
            passed = percentage >= passThreshold;
            // คำนวณเกรด / ระดับ (Grade Bands) ถ้ามีการตั้งค่า
            if (scoreConfig?.gradeBands && scoreConfig.gradeBands.length > 0) {
                const sortedBands = [...scoreConfig.gradeBands].sort((a, b) => b.minScore - a.minScore);
                const matchedBand = sortedBands.find((b) => percentage >= b.minScore);
                grade = matchedBand ? matchedBand.label : (passed ? 'ผ่าน' : 'ไม่ผ่าน');
            }
            else {
                grade = passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์';
            }
        }
        // 6. บันทึกลงตาราง Submission
        const submission = await prisma.submission.create({
            data: {
                formVersionId: latestVersion.id,
                userId: userId || null,
                answers: answers,
                score: totalScore,
                maxScore,
                passed,
                grade,
                pdpaConsent: Boolean(pdpaConsent),
            },
            include: {
                user: {
                    select: { id: true, fullName: true, username: true },
                },
            },
        });
        await createAuditLog({
            userId: userId || null,
            action: 'SUBMIT_FORM',
            entity: 'Submission',
            entityId: submission.id,
            meta: {
                formId,
                formTitle: form.title,
                version: latestVersion.version,
                score: totalScore,
                maxScore,
                passed,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        const showResult = scoreConfig ? scoreConfig.showResultToUser !== false : true;
        return {
            submissionId: submission.id,
            formTitle: form.title,
            isScoreTest,
            score: showResult ? totalScore : null,
            maxScore: showResult ? maxScore : null,
            percentage: showResult && maxScore && maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : null,
            passed: showResult ? passed : null,
            grade: showResult ? grade : null,
            showResult,
            flaggedFieldIds: showResult ? flaggedFieldIds : undefined,
            submittedAt: submission.submittedAt,
        };
    }
    /**
     * ดึงรายการคำตอบทั้งหมดของแบบฟอร์ม (Submissions) สำหรับเจ้าของฟอร์มหรือ ADMIN
     */
    static async getSubmissions(formId, userId, userRole) {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                },
            },
        });
        if (!form)
            throw new Error('ไม่พบแบบฟอร์ม');
        if (form.ownerId !== userId && userRole !== Role.ADMIN) {
            throw new Error('คุณไม่มีสิทธิ์ดูผลคำตอบของแบบฟอร์มนี้ (เฉพาะเจ้าของฟอร์มหรือผู้ดูแลระบบ)');
        }
        const versionIds = form.versions.map((v) => v.id);
        const submissions = await prisma.submission.findMany({
            where: {
                formVersionId: { in: versionIds },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                formVersion: {
                    select: { version: true },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });
        // คำนวณค่าสถิติภาพรวม
        const totalCount = submissions.length;
        let passedCount = 0;
        let scoreSum = 0;
        let scoredSubmissionsCount = 0;
        for (const sub of submissions) {
            if (sub.passed === true)
                passedCount++;
            if (sub.score !== null) {
                scoreSum += sub.score;
                scoredSubmissionsCount++;
            }
        }
        const averageScore = scoredSubmissionsCount > 0 ? Number((scoreSum / scoredSubmissionsCount).toFixed(2)) : 0;
        const passRate = totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(1)) : 0;
        const latestVersion = form.versions[0];
        const schema = latestVersion?.schema || [];
        return {
            form: {
                id: form.id,
                title: form.title,
                type: form.type,
                schema,
            },
            summary: {
                totalSubmissions: totalCount,
                averageScore,
                passedCount,
                passRate,
            },
            submissions: submissions.map((s) => ({
                id: s.id,
                userId: s.userId,
                userFullName: s.user?.fullName || 'ผู้ตอบทั่วไป (Guest / ไม่ได้ล็อกอิน)',
                username: s.user?.username || '-',
                departmentName: s.user?.department?.name || 'บุคคลภายนอก',
                version: s.formVersion.version,
                score: s.score,
                maxScore: s.maxScore,
                passed: s.passed,
                grade: s.grade,
                answers: s.answers,
                submittedAt: s.submittedAt,
            })),
        };
    }
}
