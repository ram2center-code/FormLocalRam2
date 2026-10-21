import { supabase } from '../../../lib/supabase';
import { generateId } from '../../../lib/id';
import { getCurrentUser } from '../../../lib/session';

export interface ScreeningResultItem {
  text: string;
  score?: number;
  alert?: boolean;
  sui?: boolean;
}

export interface ChildScreeningRecordItem {
  id: string;
  hn?: string | null;
  patientName?: string | null;
  birthDate?: string | null;
  assessmentDate: string;
  ageYears?: number | null;
  ageMonths?: number | null;
  totalAgeMonths?: number | null;
  screenings: Record<string, ScreeningResultItem>;
  hasAlert: boolean;
  hasSuicideRisk: boolean;
  examinerId?: string | null;
  examinerName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreeningRecordPayload {
  hn?: string | null;
  patientName?: string | null;
  birthDate?: string | null;
  assessmentDate?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  totalAgeMonths?: number | null;
  screenings: Record<string, ScreeningResultItem>;
  hasAlert?: boolean;
  hasSuicideRisk?: boolean;
  notes?: string | null;
}

const safeIsoDate = (val?: string | null): string | null => {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * บันทึกผลการคัดกรองเด็กลงฐานข้อมูล Supabase / PostgreSQL
 */
export const createScreeningRecordApi = async (
  payload: CreateScreeningRecordPayload
): Promise<ChildScreeningRecordItem> => {
  const user = getCurrentUser();
  const id = generateId('scr');
  const now = new Date().toISOString();

  let hasAlert = Boolean(payload.hasAlert);
  let hasSuicideRisk = Boolean(payload.hasSuicideRisk);

  if (payload.screenings) {
    Object.values(payload.screenings).forEach((res) => {
      if (res && res.alert) hasAlert = true;
      if (res && res.sui) hasSuicideRisk = true;
    });
  }

  // 1. ลองบันทึกผ่าน FormLocal Backend API (/api/screening) เพื่อบันทึกผ่าน Prisma ลง DB ที่ Active อยู่
  try {
    const res = await fetch('/api/screening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hn: payload.hn?.trim() || null,
        patientName: payload.patientName?.trim() || null,
        birthDate: payload.birthDate || null,
        assessmentDate: payload.assessmentDate || null,
        ageYears: payload.ageYears ?? null,
        ageMonths: payload.ageMonths ?? null,
        totalAgeMonths: payload.totalAgeMonths ?? null,
        screenings: payload.screenings || {},
        hasAlert,
        hasSuicideRisk,
        notes: payload.notes?.trim() || null,
      }),
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.success && json.data) {
        return json.data as ChildScreeningRecordItem;
      }
    }
  } catch (backendErr) {
    console.warn('Backend /api/screening save failed, falling back to direct Supabase:', backendErr);
  }

  // 2. บันทึกผ่าน Supabase Client
  const parsedBirth = safeIsoDate(payload.birthDate);
  const parsedAssessment = safeIsoDate(payload.assessmentDate) || now;

  const record = {
    id,
    hn: payload.hn?.trim() || null,
    patientName: payload.patientName?.trim() || null,
    birthDate: parsedBirth,
    assessmentDate: parsedAssessment,
    ageYears: payload.ageYears ?? null,
    ageMonths: payload.ageMonths ?? null,
    totalAgeMonths: payload.totalAgeMonths ?? null,
    screenings: payload.screenings || {},
    hasAlert,
    hasSuicideRisk,
    examinerId: user?.id || null,
    examinerName: user?.fullName || user?.username || null,
    notes: payload.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from('ChildScreeningRecord')
    .insert([record])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'บันทึกข้อมูลการคัดกรองไม่สำเร็จ');
  }

  return data as ChildScreeningRecordItem;
};

/**
 * ดึงรายการประวัติการคัดกรองทั้งหมด
 */
export const getScreeningRecordsApi = async (params?: {
  search?: string;
  hasAlert?: boolean;
  hasSuicideRisk?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<ChildScreeningRecordItem[]> => {
  let query = supabase
    .from('ChildScreeningRecord')
    .select('*')
    .order('assessmentDate', { ascending: false });

  if (params?.search) {
    const q = params.search.trim();
    query = query.or(`hn.ilike.%${q}%,patientName.ilike.%${q}%`);
  }

  if (params?.hasAlert !== undefined) {
    query = query.eq('hasAlert', params.hasAlert);
  }

  if (params?.hasSuicideRisk !== undefined) {
    query = query.eq('hasSuicideRisk', params.hasSuicideRisk);
  }

  if (params?.startDate) {
    query = query.gte('assessmentDate', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('assessmentDate', params.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลประวัติการคัดกรองได้');
  }

  return (data || []) as ChildScreeningRecordItem[];
};

/**
 * ดึงรายละเอียดผลการคัดกรองเดี่ยวตาม ID
 */
export const getScreeningRecordByIdApi = async (
  id: string
): Promise<ChildScreeningRecordItem> => {
  const { data, error } = await supabase
    .from('ChildScreeningRecord')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message || 'ไม่พบข้อมูลผลการคัดกรอง');
  }

  return data as ChildScreeningRecordItem;
};

/**
 * ลบประวัติผลการคัดกรอง
 */
export const deleteScreeningRecordApi = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('ChildScreeningRecord')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'ไม่สามารถลบข้อมูลการคัดกรองได้');
  }
};
