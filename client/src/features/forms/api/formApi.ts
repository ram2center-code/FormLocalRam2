import { supabase } from '../../../lib/supabase';
import { generateId } from '../../../lib/id';
import { getCurrentUser } from '../../../lib/session';

export type FormVisibility = 'PRIVATE' | 'DEPARTMENT' | 'PUBLIC';
export type FormType = 'GENERAL' | 'SCORE_TEST';
export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'single_choice'
  | 'multi_choice'
  | 'dropdown'
  | 'date'
  | 'rating'
  | 'file'
  | 'layer_box';

export interface FormFieldOption {
  id: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  points?: number;
  correctAnswer?: string | number | string[];
  layerId?: string | null;
  colSpan?: number;
  columns?: number;
}

export interface ScoreConfig {
  passScore: number;
  passType: 'percent' | 'points';
  showResultToUser: boolean;
  gradeBands?: Array<{ label: string; minScore: number }>;
}

export interface FormItem {
  id: string;
  title: string;
  description?: string | null;
  type: FormType;
  visibility: FormVisibility;
  status: FormStatus;
  ownerId: string;
  owner?: {
    id: string;
    fullName: string;
    username: string;
  };
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  isAcceptingResponses: boolean;
  requireLogin: boolean;
  pdpaEnabled: boolean;
  pdpaTitle?: string | null;
  pdpaContent?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  allowMultiple: boolean;
  maxAttempts?: number | null;
  latestVersionNumber: number;
  latestVersionId?: string | null;
  submissionsCount: number;
  isOwner: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormDetail extends FormItem {
  schema: FormField[];
  scoreConfig?: ScoreConfig | null;
  currentVersionNumber: number;
  currentVersionId?: string | null;
  shares: Array<{
    id: string;
    userId: string;
    user: { id: string; fullName: string; username: string };
  }>;
}

export interface CreateFormPayload {
  title: string;
  description?: string;
  type: FormType;
  visibility: FormVisibility;
  departmentId?: string | null;
  requireLogin?: boolean;
  pdpaEnabled?: boolean;
  pdpaTitle?: string | null;
  pdpaContent?: string | null;
  schema?: FormField[];
  scoreConfig?: ScoreConfig;
}

export interface UpdateFormSettingsPayload {
  isAcceptingResponses?: boolean;
  requireLogin?: boolean;
  pdpaEnabled?: boolean;
  pdpaTitle?: string | null;
  pdpaContent?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  allowMultiple?: boolean;
  maxAttempts?: number | null;
  visibility?: FormVisibility;
  departmentId?: string | null;
}

export interface SubmissionResult {
  submissionId: string;
  formTitle: string;
  isScoreTest: boolean;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  passed: boolean | null;
  grade: string | null;
  showResult: boolean;
  flaggedFieldIds?: string[];
  submittedAt: string;
}

export interface SubmissionItem {
  id: string;
  userId: string;
  userFullName: string;
  username: string;
  departmentName: string;
  version: number;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  grade: string | null;
  answers: Record<string, any>;
  submittedAt: string;
}

export interface FormSubmissionsData {
  form: {
    id: string;
    title: string;
    type: FormType;
    schema: FormField[];
  };
  summary: {
    totalSubmissions: number;
    averageScore: number;
    passedCount: number;
    passRate: number;
  };
  submissions: SubmissionItem[];
}

const mapFormItem = (form: any, currentUserId?: string, currentUserRole?: string): FormItem => {
  const versions = form.versions || [];
  const latestVersion =
    versions.length > 0
      ? versions.reduce((max: any, v: any) => (v.version > max.version ? v : max), versions[0])
      : null;

  const submissionsCount = versions.reduce(
    (acc: number, v: any) => acc + (v.submissions?.length || 0),
    0
  );

  const isOwner = form.ownerId === currentUserId || currentUserRole === 'ADMIN';

  return {
    id: form.id,
    title: form.title,
    description: form.description,
    type: form.type,
    visibility: form.visibility,
    status: form.status,
    ownerId: form.ownerId,
    owner: form.owner || undefined,
    departmentId: form.departmentId,
    department: form.department || null,
    isAcceptingResponses: form.isAcceptingResponses ?? true,
    requireLogin: form.requireLogin ?? true,
    pdpaEnabled: form.pdpaEnabled ?? false,
    pdpaTitle: form.pdpaTitle,
    pdpaContent: form.pdpaContent,
    openAt: form.openAt,
    closeAt: form.closeAt,
    allowMultiple: form.allowMultiple ?? true,
    maxAttempts: form.maxAttempts,
    latestVersionNumber: latestVersion ? latestVersion.version : 1,
    latestVersionId: latestVersion ? latestVersion.id : null,
    submissionsCount,
    isOwner,
    deletedAt: form.deletedAt,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const getFormsApi = async (): Promise<FormItem[]> => {
  const currentUser = getCurrentUser();
  const { data, error } = await supabase
    .from('Form')
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, submissions:Submission(id))
    `)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (error) {
    throw new Error(error.message || 'ไม่สามารถดึงรายการแบบฟอร์มได้');
  }

  return (data || []).map((f: any) => mapFormItem(f, currentUser?.id, currentUser?.role));
};

export const getFormByIdApi = async (id: string, _forEditing = false): Promise<FormDetail> => {
  const currentUser = getCurrentUser();
  const { data, error } = await supabase
    .from('Form')
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, schema, scoreConfig, submissions:Submission(id)),
      shares:FormShare(id, userId, user:User(id, fullName, username))
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('ไม่พบข้อมูลแบบฟอร์ม');
  }

  const baseItem = mapFormItem(data, currentUser?.id, currentUser?.role);
  const versions = data.versions || [];
  const latestVersion =
    versions.length > 0
      ? versions.reduce((max: any, v: any) => (v.version > max.version ? v : max), versions[0])
      : null;

  return {
    ...baseItem,
    schema: (latestVersion?.schema as FormField[]) || [],
    scoreConfig: (latestVersion?.scoreConfig as ScoreConfig) || null,
    currentVersionNumber: latestVersion ? latestVersion.version : 1,
    currentVersionId: latestVersion ? latestVersion.id : null,
    shares: (data.shares || []).map((s: any) => ({
      id: s.id,
      userId: s.userId,
      user: s.user,
    })),
  };
};

export const createFormApi = async (payload: CreateFormPayload): Promise<FormItem> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('กรุณาเข้าสู่ระบบก่อนสร้างแบบฟอร์ม');
  }

  const formId = generateId('form');
  const now = new Date().toISOString();

  // 1. สร้าง Form
  const { data: formData, error: formError } = await supabase
    .from('Form')
    .insert({
      id: formId,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      type: payload.type || 'GENERAL',
      visibility: payload.visibility || 'PRIVATE',
      status: 'DRAFT',
      ownerId: currentUser.id,
      departmentId: payload.departmentId || null,
      requireLogin: payload.requireLogin ?? true,
      pdpaEnabled: payload.pdpaEnabled ?? false,
      pdpaTitle: payload.pdpaTitle || null,
      pdpaContent: payload.pdpaContent || null,
      isAcceptingResponses: true,
      allowMultiple: true,
      createdAt: now,
      updatedAt: now,
    })
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name)
    `)
    .single();

  if (formError || !formData) {
    throw new Error(formError?.message || 'สร้างแบบฟอร์มไม่สำเร็จ');
  }

  // 2. สร้าง FormVersion เริ่มต้น (v1)
  const versionId = generateId('fver');
  const { error: versionError } = await supabase.from('FormVersion').insert({
    id: versionId,
    formId,
    version: 1,
    schema: payload.schema || [],
    scoreConfig: payload.scoreConfig || null,
    createdAt: now,
    updatedAt: now,
  });

  if (versionError) {
    console.error('Failed to create initial FormVersion', versionError);
  }

  return {
    ...mapFormItem(formData, currentUser.id, currentUser.role),
    latestVersionNumber: 1,
    latestVersionId: versionId,
    submissionsCount: 0,
    isOwner: true,
  };
};

export const updateFormApi = async (
  id: string,
  payload: {
    title?: string;
    description?: string;
    type?: FormType;
    visibility?: FormVisibility;
    departmentId?: string | null;
    requireLogin?: boolean;
    pdpaEnabled?: boolean;
    pdpaTitle?: string | null;
    pdpaContent?: string | null;
    schema?: FormField[];
    scoreConfig?: ScoreConfig;
  }
): Promise<FormItem> => {
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  // 1. อัปเดตข้อมูล Form
  const formUpdateData: any = { updatedAt: now };
  if (payload.title !== undefined) formUpdateData.title = payload.title.trim();
  if (payload.description !== undefined) formUpdateData.description = payload.description?.trim() || null;
  if (payload.type !== undefined) formUpdateData.type = payload.type;
  if (payload.visibility !== undefined) formUpdateData.visibility = payload.visibility;
  if (payload.departmentId !== undefined) formUpdateData.departmentId = payload.departmentId;
  if (payload.requireLogin !== undefined) formUpdateData.requireLogin = payload.requireLogin;
  if (payload.pdpaEnabled !== undefined) formUpdateData.pdpaEnabled = payload.pdpaEnabled;
  if (payload.pdpaTitle !== undefined) formUpdateData.pdpaTitle = payload.pdpaTitle;
  if (payload.pdpaContent !== undefined) formUpdateData.pdpaContent = payload.pdpaContent;

  const { data: formData, error: formError } = await supabase
    .from('Form')
    .update(formUpdateData)
    .eq('id', id)
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, submissions:Submission(id))
    `)
    .single();

  if (formError || !formData) {
    throw new Error(formError?.message || 'บันทึกแบบฟอร์มไม่สำเร็จ');
  }

  // 2. ถ้ามี schema หรือ scoreConfig ให้อัปเดตเวอร์ชันล่าสุด (หรือสร้างถ้ายังไม่มี)
  if (payload.schema !== undefined || payload.scoreConfig !== undefined) {
    const { data: versions } = await supabase
      .from('FormVersion')
      .select('id, version')
      .eq('formId', id)
      .order('version', { ascending: false });

    if (versions && versions.length > 0) {
      const latest = versions[0];
      const verUpdate: any = { updatedAt: now };
      if (payload.schema !== undefined) verUpdate.schema = payload.schema;
      if (payload.scoreConfig !== undefined) verUpdate.scoreConfig = payload.scoreConfig;
      await supabase.from('FormVersion').update(verUpdate).eq('id', latest.id);
    } else {
      await supabase.from('FormVersion').insert({
        id: generateId('fver'),
        formId: id,
        version: 1,
        schema: payload.schema || [],
        scoreConfig: payload.scoreConfig || null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return mapFormItem(formData, currentUser?.id, currentUser?.role);
};

export const publishFormApi = async (
  id: string,
  payload: { schema: FormField[]; scoreConfig?: ScoreConfig }
): Promise<{ form: FormItem; version: number }> => {
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  // 1. หาเวอร์ชันล่าสุดเพื่อบวก 1
  const { data: versions } = await supabase
    .from('FormVersion')
    .select('version')
    .eq('formId', id)
    .order('version', { ascending: false });

  const currentMax = versions && versions.length > 0 ? versions[0].version : 0;
  const nextVersion = currentMax + 1;

  // 2. สร้าง FormVersion ใหม่
  const versionId = generateId('fver');
  await supabase.from('FormVersion').insert({
    id: versionId,
    formId: id,
    version: nextVersion,
    schema: payload.schema,
    scoreConfig: payload.scoreConfig || null,
    createdAt: now,
    updatedAt: now,
  });

  // 3. เปลี่ยนสถานะ Form เป็น PUBLISHED
  const { data: formData, error: formError } = await supabase
    .from('Form')
    .update({
      status: 'PUBLISHED',
      updatedAt: now,
    })
    .eq('id', id)
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, submissions:Submission(id))
    `)
    .single();

  if (formError || !formData) {
    throw new Error(formError?.message || 'เผยแพร่แบบฟอร์มไม่สำเร็จ');
  }

  const item = mapFormItem(formData, currentUser?.id, currentUser?.role);
  return { form: item, version: nextVersion };
};

export const updateFormSettingsApi = async (
  id: string,
  payload: UpdateFormSettingsPayload
): Promise<FormItem> => {
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  const { data: formData, error } = await supabase
    .from('Form')
    .update({
      ...payload,
      updatedAt: now,
    })
    .eq('id', id)
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, submissions:Submission(id))
    `)
    .single();

  if (error || !formData) {
    throw new Error(error?.message || 'ตั้งค่าแบบฟอร์มไม่สำเร็จ');
  }

  return mapFormItem(formData, currentUser?.id, currentUser?.role);
};

export const shareFormApi = async (id: string, userIds: string[]): Promise<void> => {
  const now = new Date().toISOString();

  // ล้างการแชร์เก่าก่อน
  await supabase.from('FormShare').delete().eq('formId', id);

  if (userIds.length > 0) {
    const sharesToInsert = userIds.map((userId) => ({
      id: generateId('fshr'),
      formId: id,
      userId,
      createdAt: now,
    }));

    const { error } = await supabase.from('FormShare').insert(sharesToInsert);
    if (error) {
      throw new Error(error.message || 'ไม่สามารถบันทึกสิทธิ์การแชร์ได้');
    }
  }
};

export const deleteFormApi = async (id: string): Promise<{ action: string; message: string }> => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('Form')
    .update({ deletedAt: now, updatedAt: now })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'ไม่สามารถย้ายแบบฟอร์มไปถังขยะได้');
  }

  return {
    action: 'trashed',
    message: 'ย้ายไปถังขยะเรียบร้อยแล้ว',
  };
};

export const getTrashFormsApi = async (): Promise<FormItem[]> => {
  const currentUser = getCurrentUser();
  const { data, error } = await supabase
    .from('Form')
    .select(`
      id,
      title,
      description,
      type,
      visibility,
      status,
      ownerId,
      departmentId,
      isAcceptingResponses,
      requireLogin,
      pdpaEnabled,
      pdpaTitle,
      pdpaContent,
      openAt,
      closeAt,
      allowMultiple,
      maxAttempts,
      deletedAt,
      createdAt,
      updatedAt,
      owner:User!Form_ownerId_fkey(id, fullName, username),
      department:Department(id, name),
      versions:FormVersion(id, version, submissions:Submission(id))
    `)
    .not('deletedAt', 'is', null)
    .order('deletedAt', { ascending: false });

  if (error) {
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลถังขยะได้');
  }

  return (data || []).map((f: any) => mapFormItem(f, currentUser?.id, currentUser?.role));
};

export const restoreFormApi = async (id: string): Promise<{ action: string; message: string }> => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('Form')
    .update({ deletedAt: null, updatedAt: now })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'ไม่สามารถกู้คืนแบบฟอร์มได้');
  }

  return {
    action: 'restored',
    message: 'กู้คืนแบบฟอร์มสำเร็จ',
  };
};

export const deletePermanentlyApi = async (
  id: string
): Promise<{ action: string; message: string }> => {
  const { error } = await supabase.from('Form').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'ไม่สามารถลบแบบฟอร์มอย่างถาวรได้');
  }

  return {
    action: 'deleted_permanently',
    message: 'ลบแบบฟอร์มอย่างถาวรสำเร็จ',
  };
};

export const emptyTrashApi = async (): Promise<{ count: number; message: string }> => {
  const { data, error } = await supabase
    .from('Form')
    .delete()
    .not('deletedAt', 'is', null)
    .select('id');

  if (error) {
    throw new Error(error.message || 'ไม่สามารถล้างถังขยะได้');
  }

  return {
    count: data?.length || 0,
    message: 'ล้างถังขยะเรียบร้อยแล้ว',
  };
};

export const submitFormApi = async (
  formId: string,
  answers: Record<string, any>,
  pdpaConsent: boolean = false
): Promise<SubmissionResult> => {
  const currentUser = getCurrentUser();

  // 1. ดึงข้อมูลฟอร์มและเวอร์ชันล่าสุด
  const { data: form, error: formError } = await supabase
    .from('Form')
    .select(`
      id,
      title,
      type,
      status,
      isAcceptingResponses,
      openAt,
      closeAt,
      versions:FormVersion(id, version, schema, scoreConfig)
    `)
    .eq('id', formId)
    .single();

  if (formError || !form) {
    throw new Error('ไม่พบแบบฟอร์ม');
  }

  if (!form.isAcceptingResponses) {
    throw new Error('แบบฟอร์มนี้ปิดรับคำตอบแล้ว');
  }

  const versions = form.versions || [];
  if (versions.length === 0) {
    throw new Error('แบบฟอร์มนี้ยังไม่มีชุดคำถาม');
  }

  const latestVersion = versions.reduce(
    (max: any, v: any) => (v.version > max.version ? v : max),
    versions[0]
  );

  const isScoreTest = form.type === 'SCORE_TEST';
  let totalScore: number | null = null;
  let maxScore: number | null = null;
  let percentage: number | null = null;
  let passed: boolean | null = null;
  let grade: string | null = null;

  if (isScoreTest) {
    const schema = (latestVersion.schema as FormField[]) || [];
    let currentScore = 0;
    let currentMax = 0;

    for (const field of schema) {
      // ข้ามกล่องข้อมูลและฟิลด์ย่อยในกล่องข้อมูล (เช่น ข้อมูลเด็ก, ชื่อ-นามสกุล, HN ฯลฯ)
      if (field.type === 'layer_box' || field.layerId) continue;

      const pts = Number(field.points || 0);
      const hasAnswer =
        field.correctAnswer !== undefined &&
        field.correctAnswer !== null &&
        field.correctAnswer !== '' &&
        (Array.isArray(field.correctAnswer) ? field.correctAnswer.length > 0 : true);

      if (pts > 0 && hasAnswer) {
        currentMax += pts;
        const userAns = answers[field.id];
        let isCorrect = false;

        if (Array.isArray(field.correctAnswer)) {
          if (Array.isArray(userAns)) {
            const sortedCorrect = [...field.correctAnswer].sort().join(',');
            const sortedUser = [...userAns].sort().join(',');
            isCorrect = sortedCorrect === sortedUser;
          }
        } else {
          isCorrect = String(userAns ?? '').trim() === String(field.correctAnswer ?? '').trim();
        }

        if (isCorrect) {
          currentScore += pts;
        }
      }
    }

    if (currentMax > 0) {
      totalScore = currentScore;
      maxScore = currentMax;
      percentage = Math.round((currentScore / currentMax) * 100 * 10) / 10;
    } else {
      totalScore = null;
      maxScore = null;
      percentage = null;
    }

    const scoreConfig = latestVersion.scoreConfig as ScoreConfig | null;
    if (scoreConfig && currentMax > 0) {
      if (scoreConfig.passType === 'percent') {
        passed = percentage !== null && percentage >= (scoreConfig.passScore ?? 0);
      } else {
        passed = currentScore >= (scoreConfig.passScore ?? 0);
      }

      if (scoreConfig.gradeBands && scoreConfig.gradeBands.length > 0) {
        const sortedBands = [...scoreConfig.gradeBands].sort((a, b) => b.minScore - a.minScore);
        const checkScore = scoreConfig.passType === 'percent' ? percentage : currentScore;
        const band = sortedBands.find((b) => checkScore !== null && checkScore >= b.minScore);
        if (band) {
          grade = band.label;
        }
      }
    }
  }

  const subId = generateId('sub');
  const now = new Date().toISOString();

  const { error: subError } = await supabase.from('Submission').insert({
    id: subId,
    formVersionId: latestVersion.id,
    userId: currentUser?.id || null,
    answers,
    score: totalScore,
    maxScore,
    passed,
    grade,
    pdpaConsent: !!pdpaConsent,
    submittedAt: now,
  });

  if (subError) {
    throw new Error(subError.message || 'บันทึกคำตอบไม่สำเร็จ');
  }

  const scoreConfig = latestVersion.scoreConfig as ScoreConfig | null;

  return {
    submissionId: subId,
    formTitle: form.title,
    isScoreTest,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    grade,
    showResult: scoreConfig?.showResultToUser ?? true,
    submittedAt: now,
  };
};

export const getFormSubmissionsApi = async (formId: string): Promise<FormSubmissionsData> => {
  const { data: formData, error: formError } = await supabase
    .from('Form')
    .select(`
      id,
      title,
      type,
      versions:FormVersion(id, version, schema, scoreConfig)
    `)
    .eq('id', formId)
    .single();

  if (formError || !formData) {
    throw new Error('ไม่พบข้อมูลแบบฟอร์ม');
  }

  const versions = formData.versions || [];
  const latestVersion =
    versions.length > 0
      ? versions.reduce((max: any, v: any) => (v.version > max.version ? v : max), versions[0])
      : null;

  const { data: submissions, error: subError } = await supabase
    .from('Submission')
    .select(`
      id,
      userId,
      answers,
      score,
      maxScore,
      passed,
      grade,
      submittedAt,
      user:User(id, fullName, username, department:Department(name)),
      formVersion:FormVersion!inner(id, version, formId)
    `)
    .eq('formVersion.formId', formId)
    .order('submittedAt', { ascending: false });

  if (subError) {
    throw new Error(subError.message || 'ดึงข้อมูลผลตอบกลับไม่สำเร็จ');
  }

  const items: SubmissionItem[] = (submissions || []).map((s: any) => ({
    id: s.id,
    userId: s.userId || '',
    userFullName: s.user?.fullName || 'ผู้ใช้งานทั่วไป',
    username: s.user?.username || '-',
    departmentName: s.user?.department?.name || '-',
    version: s.formVersion?.version || 1,
    score: s.score,
    maxScore: s.maxScore,
    passed: s.passed,
    grade: s.grade,
    answers: s.answers || {},
    submittedAt: s.submittedAt,
  }));

  const total = items.length;
  const scoredItems = items.filter((i) => i.score !== null && i.score !== undefined);
  const totalScore = scoredItems.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const averageScore =
    scoredItems.length > 0 ? Math.round((totalScore / scoredItems.length) * 10) / 10 : 0;
  const passedCount = items.filter((i) => i.passed === true).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100 * 10) / 10 : 0;

  return {
    form: {
      id: formData.id,
      title: formData.title,
      type: formData.type,
      schema: (latestVersion?.schema as FormField[]) || [],
    },
    summary: {
      totalSubmissions: total,
      averageScore,
      passedCount,
      passRate,
    },
    submissions: items,
  };
};
