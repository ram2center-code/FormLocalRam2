import { prisma } from '../../lib/prisma.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
export class DepartmentService {
    static async getAll() {
        return prisma.department.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        forms: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    static async getById(id) {
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        forms: true,
                    },
                },
            },
        });
        if (!department) {
            throw new Error('ไม่พบข้อมูลแผนกที่ระบุ');
        }
        return department;
    }
    static async create(input, actorId, meta) {
        const existing = await prisma.department.findUnique({
            where: { name: input.name },
        });
        if (existing) {
            throw new Error(`ชื่อแผนก "${input.name}" มีอยู่ในระบบแล้ว`);
        }
        const department = await prisma.department.create({
            data: {
                name: input.name,
            },
        });
        await createAuditLog({
            userId: actorId,
            action: 'DEPARTMENT_CREATE',
            entity: 'Department',
            entityId: department.id,
            meta: {
                name: department.name,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return department;
    }
    static async update(id, input, actorId, meta) {
        const department = await prisma.department.findUnique({
            where: { id },
        });
        if (!department) {
            throw new Error('ไม่พบข้อมูลแผนกที่ต้องการแก้ไข');
        }
        // ตรวจสอบชื่อซ้ำกับแผนกอื่น
        const duplicate = await prisma.department.findFirst({
            where: {
                name: input.name,
                NOT: { id },
            },
        });
        if (duplicate) {
            throw new Error(`ชื่อแผนก "${input.name}" ถูกใช้งานโดยแผนกอื่นแล้ว`);
        }
        const previousName = department.name;
        const updated = await prisma.department.update({
            where: { id },
            data: {
                name: input.name,
            },
        });
        await createAuditLog({
            userId: actorId,
            action: 'DEPARTMENT_UPDATE',
            entity: 'Department',
            entityId: updated.id,
            meta: {
                before: { name: previousName },
                after: { name: updated.name },
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return updated;
    }
    static async delete(id, actorId, meta) {
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        forms: true,
                    },
                },
            },
        });
        if (!department) {
            throw new Error('ไม่พบข้อมูลแผนกที่ต้องการลบ');
        }
        if (department._count.users > 0) {
            throw new Error(`ไม่สามารถลบแผนก "${department.name}" ได้ เนื่องจากยังมีผู้ใช้งานสังกัดอยู่ ${department._count.users} คน (กรุณาย้ายผู้ใช้ไปแผนกอื่นก่อน)`);
        }
        if (department._count.forms > 0) {
            throw new Error(`ไม่สามารถลบแผนก "${department.name}" ได้ เนื่องจากมีแบบฟอร์มของแผนกนี้อยู่ ${department._count.forms} ฟอร์ม`);
        }
        await prisma.department.delete({
            where: { id },
        });
        await createAuditLog({
            userId: actorId,
            action: 'DEPARTMENT_DELETE',
            entity: 'Department',
            entityId: id,
            meta: {
                name: department.name,
            },
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return { id, name: department.name };
    }
}
