import { create } from 'zustand';
import { User, LoginPayload } from '../types/auth';
import { loginApi, logoutApi, refreshApi } from '../features/auth/api/authApi';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,

  setAccessToken: (token) => {
    set({
      accessToken: token,
      isAuthenticated: !!token,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  setError: (error) => {
    set({ error });
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loginApi(payload);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return data.user;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      set({
        isLoading: false,
        error: errorMessage,
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch {
      // แม้เรียก logout API ไม่สำเร็จ ก็ต้องล้าง state หน้าบ้าน
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  initializeAuth: async () => {
    set({ isInitializing: true });
    try {
      // เมื่อโหลดเว็บครั้งแรก ลองเรียก refresh token จาก httpOnly cookie
      const data = await refreshApi();
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
      });
    } catch {
      // ไม่มี cookie หรือ token หมดอายุ ให้คงสถานะ unauthenticated
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isInitializing: false });
    }
  },
}));
