import apiClient from '../../../api/axios';
import { ApiResponse } from '../../../types/auth';

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
  colSpan?: number; // 12 (half-width / 2 cols) or 24 (full width)
  columns?: number; // default 2 columns for layer_box
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

export const getFormsApi = async (): Promise<FormItem[]> => {
  const response = await apiClient.get<ApiResponse<FormItem[]>>('/forms');
  return response.data.data || [];
};

export const getFormByIdApi = async (id: string, forEditing = false): Promise<FormDetail> => {
  const response = await apiClient.get<ApiResponse<FormDetail>>(`/forms/${id}`, {
    params: { forEditing: forEditing ? 'true' : undefined },
  });
  if (!response.data.data) throw new Error('ไม่พบข้อมูลแบบฟอร์ม');
  return response.data.data;
};

export const createFormApi = async (payload: CreateFormPayload): Promise<FormItem> => {
  const response = await apiClient.post<ApiResponse<FormItem>>('/forms', payload);
  if (!response.data.data) throw new Error(response.data.message || 'สร้างแบบฟอร์มไม่สำเร็จ');
  return response.data.data;
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
  const response = await apiClient.put<ApiResponse<FormItem>>(`/forms/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'บันทึกแบบฟอร์มไม่สำเร็จ');
  return response.data.data;
};

export const publishFormApi = async (
  id: string,
  payload: { schema: FormField[]; scoreConfig?: ScoreConfig }
): Promise<{ form: FormItem; version: number }> => {
  const response = await apiClient.post<ApiResponse<{ form: FormItem; version: number }>>(
    `/forms/${id}/publish`,
    payload
  );
  if (!response.data.data) throw new Error(response.data.message || 'เผยแพร่แบบฟอร์มไม่สำเร็จ');
  return response.data.data;
};

export const updateFormSettingsApi = async (
  id: string,
  payload: UpdateFormSettingsPayload
): Promise<FormItem> => {
  const response = await apiClient.patch<ApiResponse<FormItem>>(`/forms/${id}/settings`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'ตั้งค่าแบบฟอร์มไม่สำเร็จ');
  return response.data.data;
};

export const shareFormApi = async (id: string, userIds: string[]): Promise<void> => {
  await apiClient.post<ApiResponse>(`/forms/${id}/share`, { userIds });
};

export const deleteFormApi = async (id: string): Promise<{ action: string; message: string }> => {
  const response = await apiClient.delete<ApiResponse<{ action: string }>>(`/forms/${id}`);
  return {
    action: response.data.data?.action || 'trashed',
    message: response.data.message || 'ย้ายไปถังขยะเรียบร้อยแล้ว',
  };
};

export const getTrashFormsApi = async (): Promise<FormItem[]> => {
  const response = await apiClient.get<ApiResponse<FormItem[]>>('/forms/trash');
  return response.data.data || [];
};

export const restoreFormApi = async (id: string): Promise<{ action: string; message: string }> => {
  const response = await apiClient.post<ApiResponse<{ action: string }>>(`/forms/${id}/restore`);
  return {
    action: response.data.data?.action || 'restored',
    message: response.data.message || 'กู้คืนแบบฟอร์มสำเร็จ',
  };
};

export const deletePermanentlyApi = async (id: string): Promise<{ action: string; message: string }> => {
  const response = await apiClient.delete<ApiResponse<{ action: string }>>(`/forms/${id}/permanent`);
  return {
    action: response.data.data?.action || 'deleted_permanently',
    message: response.data.message || 'ลบแบบฟอร์มอย่างถาวรสำเร็จ',
  };
};

export const emptyTrashApi = async (): Promise<{ count: number; message: string }> => {
  const response = await apiClient.delete<ApiResponse<{ count: number }>>('/forms/trash/empty');
  return {
    count: response.data.data?.count || 0,
    message: response.data.message || 'ล้างถังขยะเรียบร้อยแล้ว',
  };
};

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

export const submitFormApi = async (
  formId: string,
  answers: Record<string, any>,
  pdpaConsent: boolean = false
): Promise<SubmissionResult> => {
  const response = await apiClient.post<ApiResponse<SubmissionResult>>(`/forms/${formId}/submit`, {
    answers,
    pdpaConsent,
  });
  if (!response.data.data) throw new Error(response.data.message || 'ส่งคำตอบไม่สำเร็จ');
  return response.data.data;
};

export const getFormSubmissionsApi = async (formId: string): Promise<FormSubmissionsData> => {
  const response = await apiClient.get<ApiResponse<FormSubmissionsData>>(`/forms/${formId}/submissions`);
  if (!response.data.data) throw new Error(response.data.message || 'ดึงข้อมูลผลตอบกลับไม่สำเร็จ');
  return response.data.data;
};

