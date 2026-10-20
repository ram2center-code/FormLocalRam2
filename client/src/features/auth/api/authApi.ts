import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabase';
import {
  LoginPayload,
  LoginResponseData,
  RefreshResponseData,
  User,
} from '../../../types/auth';

const SESSION_STORAGE_KEY = 'formlocal_user_session';

const normalizeDept = (dept: any) => {
  if (!dept) return null;
  if (Array.isArray(dept)) {
    return dept.length > 0 ? { id: String(dept[0].id), name: String(dept[0].name) } : null;
  }
  return { id: String(dept.id), name: String(dept.name) };
};

export const loginApi = async (payload: LoginPayload): Promise<LoginResponseData> => {
  const usernameOrEmail = payload.username.trim();

  // 1. ค้นหาผู้ใช้จาก username หรือ email
  const { data, error } = await supabase
    .from('User')
    .select(`
      id,
      username,
      email,
      fullName,
      passwordHash,
      role,
      isActive,
      departmentId,
      department:Department(id, name)
    `)
    .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  const dbUser = data[0];

  // 2. ตรวจสอบสถานะการใช้งาน
  if (!dbUser.isActive) {
    throw new Error('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }

  // 3. ตรวจสอบรหัสผ่านด้วย bcrypt
  const isMatch = bcrypt.compareSync(payload.password, dbUser.passwordHash);
  if (!isMatch) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  // 4. สร้าง token สำหรับ session
  const accessToken = `sb_token_${dbUser.id}_${Date.now()}`;

  const user: User = {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    fullName: dbUser.fullName,
    role: dbUser.role,
    isActive: dbUser.isActive,
    departmentId: dbUser.departmentId,
    department: normalizeDept(dbUser.department),
  };

  const sessionData: LoginResponseData = {
    user,
    accessToken,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }

  return sessionData;
};

export const refreshApi = async (): Promise<RefreshResponseData> => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      throw new Error('No active session');
    }
    const session: LoginResponseData = JSON.parse(raw);
    if (!session || !session.user || !session.user.id) {
      throw new Error('Invalid session data');
    }

    // ดึงข้อมูลผู้ใช้ล่าสุดจาก Supabase
    const { data, error } = await supabase
      .from('User')
      .select(`
        id,
        username,
        email,
        fullName,
        role,
        isActive,
        departmentId,
        department:Department(id, name)
      `)
      .eq('id', session.user.id)
      .single();

    if (error || !data || !data.isActive) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      throw new Error('User inactive or not found');
    }

    const updatedUser: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      isActive: data.isActive,
      departmentId: data.departmentId,
      department: normalizeDept(data.department),
    };

    const newSession: RefreshResponseData = {
      user: updatedUser,
      accessToken: session.accessToken || `sb_token_${data.id}_${Date.now()}`,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    return newSession;
  } catch (err: any) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    throw new Error(err.message || 'Refresh failed');
  }
};

export const logoutApi = async (): Promise<void> => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Error during logout', e);
  }
};

export const getMeApi = async (): Promise<User> => {
  const session = await refreshApi();
  return session.user;
};
