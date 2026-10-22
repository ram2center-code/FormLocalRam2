import { prisma } from '../../lib/prisma.js';
export class ScreeningService {
    /**
     * บันทึกผลการคัดกรองเด็กและวัยรุ่นลงฐานข้อมูล
     */
    static async create(input, examinerId, examinerName) {
        let parsedBirthDate = null;
        if (input.birthDate) {
            const d = new Date(input.birthDate);
            if (!isNaN(d.getTime()))
                parsedBirthDate = d;
        }
        let parsedAssessmentDate = new Date();
        if (input.assessmentDate) {
            const d = new Date(input.assessmentDate);
            if (!isNaN(d.getTime()))
                parsedAssessmentDate = d;
        }
        // ตรวจสอบ alert อัตโนมัติจากผลการคัดกรองหากไม่ได้ส่งมา
        let hasAlert = Boolean(input.hasAlert);
        let hasSuicideRisk = Boolean(input.hasSuicideRisk);
        if (input.screenings && typeof input.screenings === 'object') {
            Object.values(input.screenings).forEach((res) => {
                if (res && res.alert)
                    hasAlert = true;
                if (res && res.sui)
                    hasSuicideRisk = true;
            });
        }
        const record = await prisma.childScreeningRecord.create({
            data: {
                hn: input.hn?.trim() || null,
                patientName: input.patientName?.trim() || null,
                birthDate: parsedBirthDate,
                assessmentDate: parsedAssessmentDate,
                ageYears: input.ageYears ?? null,
                ageMonths: input.ageMonths ?? null,
                totalAgeMonths: input.totalAgeMonths ?? null,
                screenings: input.screenings,
                hasAlert,
                hasSuicideRisk,
                examinerId: examinerId || null,
                examinerName: examinerName || null,
                notes: input.notes?.trim() || null,
            },
        });
        // ซิงค์เรคคอร์ดลงตาราง Submission ของ FormLocal โดยอัตโนมัติ
        try {
            const suiteFormVersion = await prisma.formVersion.findFirst({
                where: { formId: 'form_child_screening_suite' },
                orderBy: { version: 'desc' },
            });
            if (suiteFormVersion) {
                await prisma.submission.create({
                    data: {
                        formVersionId: suiteFormVersion.id,
                        userId: examinerId || null,
                        answers: {
                            hn: input.hn?.trim() || null,
                            patientName: input.patientName?.trim() || null,
                            birthDate: input.birthDate || null,
                            assessmentDate: input.assessmentDate || null,
                            ageYears: input.ageYears ?? null,
                            ageMonths: input.ageMonths ?? null,
                            totalAgeMonths: input.totalAgeMonths ?? null,
                            screenings: input.screenings || {},
                            hasAlert,
                            hasSuicideRisk,
                            notes: input.notes?.trim() || null,
                        },
                        pdpaConsent: true,
                        submittedAt: parsedAssessmentDate,
                    },
                });
            }
        }
        catch (syncErr) {
            console.warn('Could not sync to Submission table:', syncErr);
        }
        return record;
    }
    /**
     * ดึงรายการประวัติการคัดกรองทั้งหมด พร้อมตัวกรองค้นหา
     */
    static async getAll(params) {
        const page = Math.max(1, Number(params?.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (params?.search) {
            const q = params.search.trim();
            where.OR = [
                { hn: { contains: q, mode: 'insensitive' } },
                { patientName: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (params?.hasAlert !== undefined) {
            where.hasAlert = params.hasAlert;
        }
        if (params?.hasSuicideRisk !== undefined) {
            where.hasSuicideRisk = params.hasSuicideRisk;
        }
        const [total, records] = await Promise.all([
            prisma.childScreeningRecord.count({ where }),
            prisma.childScreeningRecord.findMany({
                where,
                orderBy: { assessmentDate: 'desc' },
                skip,
                take: limit,
                include: {
                    examiner: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            department: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
        ]);
        return {
            records,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * ดึงรายละเอียดผลการคัดกรองรายบุคคลตาม ID
     */
    static async getById(id) {
        return prisma.childScreeningRecord.findUnique({
            where: { id },
            include: {
                examiner: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        department: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }
    /**
     * ลบประวัติการคัดกรอง
     */
    static async delete(id) {
        return prisma.childScreeningRecord.delete({
            where: { id },
        });
    }
    /**
     * สรุปสถิติภาพรวมการคัดกรอง
     */
    static async getStats() {
        const [total, alertCount, suicideCount] = await Promise.all([
            prisma.childScreeningRecord.count(),
            prisma.childScreeningRecord.count({ where: { hasAlert: true } }),
            prisma.childScreeningRecord.count({ where: { hasSuicideRisk: true } }),
        ]);
        return {
            total,
            normalCount: total - alertCount,
            alertCount,
            suicideCount,
        };
    }
    /**
     * ดึงการตั้งค่าข้อความ PDPA สำหรับชุดคัดกรองเด็ก
     */
    static async getPdpaConfig() {
        try {
            const form = await prisma.form.findUnique({
                where: { id: 'form_child_screening_suite' },
                select: { pdpaTitle: true, pdpaContent: true },
            });
            if (form && form.pdpaContent) {
                try {
                    const parsed = JSON.parse(form.pdpaContent);
                    return { ...DEFAULT_SUITE_PDPA_CONFIG, ...parsed };
                }
                catch (_) {
                    // If content is plain string or invalid JSON
                    return {
                        ...DEFAULT_SUITE_PDPA_CONFIG,
                        mainTitle: form.pdpaTitle || DEFAULT_SUITE_PDPA_CONFIG.mainTitle,
                        sec1Content: form.pdpaContent || DEFAULT_SUITE_PDPA_CONFIG.sec1Content,
                    };
                }
            }
        }
        catch (e) {
            console.warn('[ScreeningService] Could not fetch PDPA config from DB, using default:', e);
        }
        return DEFAULT_SUITE_PDPA_CONFIG;
    }
    /**
     * บันทึกการตั้งค่าข้อความ PDPA สำหรับชุดคัดกรองเด็ก
     */
    static async updatePdpaConfig(config, userId) {
        const merged = { ...DEFAULT_SUITE_PDPA_CONFIG, ...config };
        const contentStr = JSON.stringify(merged);
        const title = merged.mainTitle || DEFAULT_SUITE_PDPA_CONFIG.mainTitle;
        // ตรวจสอบหรือสร้าง form_child_screening_suite
        const existing = await prisma.form.findUnique({
            where: { id: 'form_child_screening_suite' },
        });
        if (existing) {
            await prisma.form.update({
                where: { id: 'form_child_screening_suite' },
                data: {
                    pdpaEnabled: true,
                    pdpaTitle: title,
                    pdpaContent: contentStr,
                },
            });
        }
        else {
            // Find admin user or first user as owner
            const defaultOwner = await prisma.user.findFirst({
                where: { role: 'ADMIN' },
            }) || await prisma.user.findFirst();
            if (defaultOwner) {
                await prisma.form.create({
                    data: {
                        id: 'form_child_screening_suite',
                        title: 'ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น',
                        description: 'Child & Adolescent Screening Suite (M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A)',
                        status: 'PUBLISHED',
                        visibility: 'PUBLIC',
                        ownerId: userId || defaultOwner.id,
                        pdpaEnabled: true,
                        pdpaTitle: title,
                        pdpaContent: contentStr,
                    },
                });
            }
        }
        return merged;
    }
}
export const DEFAULT_SUITE_PDPA_CONFIG = {
    headerTitle: 'RAM2 Preliminary Assessment',
    headerSubtitle: 'โรงพยาบาลรามคำแหง 2',
    mainTitle: 'หนังสือให้ความยินยอมในการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล',
    mainSubtitle: 'โปรดอ่านรายละเอียดก่อนเริ่มทำแบบประเมิน',
    formName: 'ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น',
    formDesc: 'Child & Adolescent Screening Suite (M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A)',
    sec1Title: '1. วัตถุประสงค์ในการเก็บข้อมูล',
    sec1Content: 'โรงพยาบาลรามคำแหง 2 ประสงค์จะเก็บรวบรวมและประมวลผลข้อมูลที่ท่านให้ผ่านแบบสอบถาม เพื่อคำนวณและแสดงผลการประเมินเบื้องต้นตามเกณฑ์ของแบบประเมินที่ท่านเลือก รวมถึงให้ข้อมูลประกอบการพิจารณาว่าควรได้รับการประเมินเพิ่มเติมหรือไม่',
    sec2Title: '2. ประเภทข้อมูลที่อาจเก็บรวบรวม',
    sec2Items: [
        'ข้อมูลทั่วไปที่จำเป็น เช่น อายุหรือช่วงอายุ',
        'คำตอบเกี่ยวกับอาการ พฤติกรรม พัฒนาการ หรือสุขภาพ ตามหัวข้อที่เลือก',
        'ผลการประเมินที่คำนวณจากคำตอบ',
        'ข้อมูลติดต่อ เฉพาะกรณีที่มีการร้องขอและแจ้งวัตถุประสงค์ไว้โดยชัดเจน',
        'ข้อมูลทางเทคนิคที่จำเป็นต่อการรักษาความปลอดภัยของระบบ ตามที่ระบุในประกาศความเป็นส่วนตัว',
    ],
    sec3Title: '3. ข้อจำกัดของบริการ',
    sec3Content: 'ระบบนี้เป็นเพียงเครื่องมือคัดกรองและประเมินเบื้องต้น ไม่ใช่การวินิจฉัยโรคหรือการรักษาพยาบาล ผลการประเมินไม่สามารถยืนยันว่าท่านมีหรือไม่มีโรคได้',
    sec4Title: '4. การรักษาความลับและสิทธิของท่าน',
    sec4Content: 'โรงพยาบาลจะจำกัดการเข้าถึงข้อมูลตามสิทธิและหน้าที่ที่เกี่ยวข้อง และดำเนินการตามประกาศความเป็นส่วนตัว ท่านสามารถติดต่อ DPO เพื่อสอบถามหรือใช้สิทธิตามกฎหมาย รวมถึงถอนความยินยอมในกรณีที่การประมวลผลอาศัยความยินยอมเป็นฐานกฎหมาย',
    dpoEmail: 'PDPA@ram2-hosp.com',
    checkbox1: 'ข้าพเจ้าได้อ่านและรับทราบประกาศความเป็นส่วนตัว รวมถึงวัตถุประสงค์และข้อจำกัดของแบบประเมินแล้ว',
    checkbox2: 'ข้าพเจ้ายินยอมโดยชัดแจ้งให้โรงพยาบาลรามคำแหง 2 เก็บรวบรวม ใช้ และประมวลผลข้อมูลสุขภาพที่ข้าพเจ้าให้ผ่านแบบประเมินนี้ เพื่อวัตถุประสงค์ที่ระบุไว้ข้างต้นและในประกาศความเป็นส่วนตัว',
    submitBtnText: 'ยินยอมและเริ่มทำแบบประเมิน',
    footerNote: 'หากยังไม่ประสงค์ให้ความยินยอม สามารถย่อหน้าต่างนี้ไว้ก่อนได้ (แบบฟอร์มจะถูกล็อกจนกว่าจะยินยอม)',
    drawerTitle: 'ประกาศความเป็นส่วนตัวฉบับเต็ม',
    drawerSubtitle: 'โรงพยาบาลรามคำแหง 2 • พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
    drawerIntro: 'โรงพยาบาลรามคำแหง 2 ให้ความสำคัญสูงสุดต่อการคุ้มครองข้อมูลส่วนบุคคลและข้อมูลสุขภาพของท่าน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
    drawerSec1Title: '1. การเก็บรวบรวมข้อมูลส่วนบุคคล',
    drawerSec1Content: 'โรงพยาบาลจะเก็บรวบรวมข้อมูลส่วนบุคคลเท่าที่จำเป็นตามวัตถุประสงค์ที่ได้แจ้งไว้ ทั้งข้อมูลทั่วไปและข้อมูลสุขภาพ (Sensitive Data) โดยได้รับความยินยอมโดยชัดแจ้งจากท่าน',
    drawerSec2Title: '2. ฐานทางกฎหมายในการประมวลผล',
    drawerSec2Content: 'การประมวลผลข้อมูลส่วนบุคคลและข้อมูลสุขภาพดำเนินการภายใต้ฐานทางกฎหมายที่เกี่ยวข้อง: ฐานความยินยอม (Consent) สำหรับข้อมูลสุขภาพและพฤติกรรม, ฐานประโยชน์สำคัญต่อชีวิต (Vital Interest) สำหรับการวินิจฉัยและการรักษาพยาบาล, และฐานการปฏิบัติตามกฎหมาย (Legal Obligation)',
    drawerSec3Title: '3. ระยะเวลาการเก็บรักษา',
    drawerSec3Content: 'ข้อมูลจะถูกจัดเก็บรักษาไว้อย่างปลอดภัยตามมาตรฐานความมั่นคงปลอดภัยสารสนเทศและตามระยะเวลาที่กฎหมายและมาตรฐานทางการแพทย์กำหนด โดยจะทำลายหรือทำให้เป็นข้อมูลนิรนามเมื่อสิ้นสุดความจำเป็น',
    drawerSec4Title: '4. สิทธิของเจ้าของข้อมูลส่วนบุคคล',
    drawerSec4Content: 'ท่านมีสิทธิในการขอเข้าถึง ขอรับสำเนา ขอแก้ไข คัดค้าน ระงับ หรือขอลบ/ทำลายข้อมูล รวมถึงถอนความยินยอมได้ตลอดเวลา โดยติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)',
};
