import apiClient from '../../../api/axios';
import {
  ApiResponse,
  LoginPayload,
  LoginResponseData,
  RefreshResponseData,
  User,
} from '../../../types/auth';

export const loginApi = async (payload: LoginPayload): Promise<LoginResponseData> => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', payload);
  if (!response.data.data) {
    throw new Error(response.data.message || 'Login failed');
  }
  return response.data.data;
};

export const refreshApi = async (): Promise<RefreshResponseData> => {
  const response = await apiClient.post<ApiResponse<RefreshResponseData>>('/auth/refresh');
  if (!response.data.data) {
    throw new Error(response.data.message || 'Refresh failed');
  }
  return response.data.data;
};

export const logoutApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  if (!response.data.data) {
    throw new Error(response.data.message || 'Failed to fetch user profile');
  }
  return response.data.data;
};
