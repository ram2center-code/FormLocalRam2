import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { ApiResponse, RefreshResponseData } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // สำคัญมาก เพื่อส่ง httpOnly refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag และ Queue เพื่อจัดการ Race Condition เมื่อหลาย Request ได้ 401 พร้อมกัน
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: แนบ Access Token ทุกครั้งถ้ามีใน Memory (Zustand)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: จัดการ 401 และ Auto-Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // ถ้า error 401 เกิดจาก login หรือ refresh เอง ไม่ต้อง refresh ซ้ำ
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // หากมีกระบวนการ Refresh Token อยู่แล้ว ให้เข้าคิวรอ
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ยิง refresh token ด้วย axios แยกเพื่อไม่ให้ติด interceptor loop
        const { data } = await axios.post<ApiResponse<RefreshResponseData>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token received from refresh');
        }

        // อัปเดต Token ใน Zustand Store
        useAuthStore.getState().setAccessToken(newAccessToken);
        if (data.data?.user) {
          useAuthStore.getState().setUser(data.data.user);
        }

        // ปล่อยคำขอที่รออยู่ในคิวทั้งหมด
        processQueue(null, newAccessToken);

        // ทำคำขอเดิมซ้ำด้วย Token ใหม่
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh ล้มเหลว -> บังคับ Logout เคลียร์ State
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
