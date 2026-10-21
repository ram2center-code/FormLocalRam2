import { prisma } from '../../lib/prisma.js';
import { CreateScreeningRecordInput } from './screening.schema.js';

export class ScreeningService {
  /**
   * บันทึกผลการคัดกรองเด็กและวัยรุ่นลงฐานข้อมูล
   */
  static async create(input: CreateScreeningRecordInput, examinerId?: string, examinerName?: string) {
    let parsedBirthDate: Date | null = null;
    if (input.birthDate) {
      const d = new Date(input.birthDate);
      if (!isNaN(d.getTime())) parsedBirthDate = d;
    }

    let parsedAssessmentDate: Date = new Date();
    if (input.assessmentDate) {
      const d = new Date(input.assessmentDate);
      if (!isNaN(d.getTime())) parsedAssessmentDate = d;
    }

    // ตรวจสอบ alert อัตโนมัติจากผลการคัดกรองหากไม่ได้ส่งมา
    let hasAlert = Boolean(input.hasAlert);
    let hasSuicideRisk = Boolean(input.hasSuicideRisk);

    if (input.screenings && typeof input.screenings === 'object') {
      Object.values(input.screenings).forEach((res: any) => {
        if (res && res.alert) hasAlert = true;
        if (res && res.sui) hasSuicideRisk = true;
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
        screenings: input.screenings as any,
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
    } catch (syncErr) {
      console.warn('Could not sync to Submission table:', syncErr);
    }

    return record;
  }

  /**
   * ดึงรายการประวัติการคัดกรองทั้งหมด พร้อมตัวกรองค้นหา
   */
  static async getAll(params?: {
    search?: string;
    hasAlert?: boolean;
    hasSuicideRisk?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

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
  static async getById(id: string) {
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
  static async delete(id: string) {
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
}
