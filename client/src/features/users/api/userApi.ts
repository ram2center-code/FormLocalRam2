import apiClient from '../../../api/axios';
import { ApiResponse, Role } from '../../../types/auth';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  _count: {
    forms: number;
    submissions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserFilterParams {
  search?: string;
  departmentId?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  departmentId?: string | null;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  email: string;
  fullName: string;
  role: Role;
  departmentId?: string | null;
  isActive: boolean;
}

export const getUsersApi = async (params?: UserFilterParams): Promise<UserItem[]> => {
  const response = await apiClient.get<ApiResponse<UserItem[]>>('/users', { params });
  return response.data.data || [];
};

export const createUserApi = async (payload: CreateUserPayload): Promise<UserItem> => {
  const response = await apiClient.post<ApiResponse<UserItem>>('/users', payload);
  if (!response.data.data) {
    throw new Error(response.data.message || 'ไม่สามารถสร้างผู้ใช้งานได้');
  }
  return response.data.data;
};

export const updateUserApi = async (id: string, payload: UpdateUserPayload): Promise<UserItem> => {
  const response = await apiClient.put<ApiResponse<UserItem>>(`/users/${id}`, payload);
  if (!response.data.data) {
    throw new Error(response.data.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
  }
  return response.data.data;
};

export const toggleUserStatusApi = async (id: string, isActive: boolean): Promise<UserItem> => {
  const response = await apiClient.patch<ApiResponse<UserItem>>(`/users/${id}/status`, { isActive });
  if (!response.data.data) {
    throw new Error(response.data.message || 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
  }
  return response.data.data;
};

export const resetPasswordApi = async (id: string, newPassword: string): Promise<void> => {
  await apiClient.patch<ApiResponse>(`/users/${id}/reset-password`, { newPassword });
};

export const deleteUserApi = async (id: string): Promise<{ message: string; action: string }> => {
  const response = await apiClient.delete<ApiResponse<{ action: string }>>(`/users/${id}`);
  return {
    message: response.data.message || 'ดำเนินการสำเร็จ',
    action: response.data.data?.action || 'deleted',
  };
};

export interface UserLookupItem {
  id: string;
  username: string;
  fullName: string;
  department?: { id: string; name: string } | null;
}

export const lookupUsersApi = async (search?: string): Promise<UserLookupItem[]> => {
  const response = await apiClient.get<ApiResponse<UserLookupItem[]>>('/users/lookup', {
    params: { search: search ? search.trim() : undefined },
  });
  return response.data.data || [];
};

