export type Role = 'ADMIN' | 'USER';

export interface Department {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  departmentId: string | null;
  department?: Department | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
}

export interface RefreshResponseData {
  user: User;
  accessToken: string;
}
