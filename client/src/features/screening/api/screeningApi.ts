import { supabase } from '../../../lib/supabase';
import { generateId } from '../../../lib/id';
import { getCurrentUser } from '../../../lib/session';

export interface ScreeningResultItem {
  text: string;
  score?: number | string;
  alert?: boolean;
  sui?: boolean;
  tag?: string;
  title?: string;
  answers?: any[];
  flaggedAnswers?: any[];
  [key: string]: any;
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

export interface PdpaSuiteConfig {
  headerTitle: string;
  headerSubtitle: string;
  mainTitle: string;
  mainSubtitle: string;
  formName: string;
  formDesc: string;
  sec1Title: string;
  sec1Content: string;
  sec2Title: string;
  sec2Items: string[];
  sec3Title: string;
  sec3Content: string;
  sec4Title: string;
  sec4Content: string;
  dpoEmail: string;
  checkbox1: string;
  checkbox2: string;
  submitBtnText: string;
  footerNote: string;
  drawerTitle: string;
  drawerSubtitle: string;
  drawerIntro: string;
  drawerSec1Title: string;
  drawerSec1Content: string;
  drawerSec2Title: string;
  drawerSec2Content: string;
  drawerSec3Title: string;
  drawerSec3Content: string;
  drawerSec4Title: string;
  drawerSec4Content: string;
}

export const DEFAULT_SUITE_PDPA_CONFIG: PdpaSuiteConfig = {
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

export const getPdpaConfigApi = async (): Promise<PdpaSuiteConfig> => {
  try {
    const res = await fetch('/api/screening/pdpa-config');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { ...DEFAULT_SUITE_PDPA_CONFIG, ...json.data };
      }
    }
  } catch (err) {
    console.warn('Could not fetch PDPA config from server, using default/localStorage:', err);
  }
  const local = typeof window !== 'undefined' ? localStorage.getItem('suite_pdpa_custom_config') : null;
  if (local) {
    try {
      return { ...DEFAULT_SUITE_PDPA_CONFIG, ...JSON.parse(local) };
    } catch (_) {}
  }
  return DEFAULT_SUITE_PDPA_CONFIG;
};

export const updatePdpaConfigApi = async (config: Partial<PdpaSuiteConfig>): Promise<PdpaSuiteConfig> => {
  const merged = { ...DEFAULT_SUITE_PDPA_CONFIG, ...config };
  if (typeof window !== 'undefined') {
    localStorage.setItem('suite_pdpa_custom_config', JSON.stringify(merged));
  }

  try {
    const res = await fetch('/api/screening/pdpa-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { ...DEFAULT_SUITE_PDPA_CONFIG, ...json.data };
      }
    }
  } catch (err) {
    console.warn('Failed to update PDPA config on server, saved locally:', err);
  }
  return merged;
};

