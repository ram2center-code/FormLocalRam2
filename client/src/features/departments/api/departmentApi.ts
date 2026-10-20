import apiClient from '../../../api/axios';
import { ApiResponse } from '../../../types/auth';

export interface DepartmentItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    forms: number;
  };
}

export const getDepartmentsApi = async (): Promise<DepartmentItem[]> => {
  const response = await apiClient.get<ApiResponse<DepartmentItem[]>>('/departments');
  return response.data.data || [];
};

export const createDepartmentApi = async (name: string): Promise<DepartmentItem> => {
  const response = await apiClient.post<ApiResponse<DepartmentItem>>('/departments', { name });
  if (!response.data.data) {
    throw new Error(response.data.message || 'ไม่สามารถสร้างแผนกได้');
  }
  return response.data.data;
};

export const updateDepartmentApi = async (id: string, name: string): Promise<DepartmentItem> => {
  const response = await apiClient.put<ApiResponse<DepartmentItem>>(`/departments/${id}`, { name });
  if (!response.data.data) {
    throw new Error(response.data.message || 'ไม่สามารถแก้ไขแผนกได้');
  }
  return response.data.data;
};

export const deleteDepartmentApi = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse>(`/departments/${id}`);
};
