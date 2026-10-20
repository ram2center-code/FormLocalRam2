import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabase';
import { Role } from '../../../types/auth';
import { generateId } from '../../../lib/id';

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

export interface UserLookupItem {
  id: string;
  username: string;
  fullName: string;
  department?: { id: string; name: string } | null;
}

const normalizeDept = (dept: any): { id: string; name: string } | null => {
  if (!dept) return null;
  if (Array.isArray(dept)) {
    return dept.length > 0 ? { id: String(dept[0].id), name: String(dept[0].name) } : null;
  }
  return { id: String(dept.id), name: String(dept.name) };
};

export const getUsersApi = async (params?: UserFilterParams): Promise<UserItem[]> => {
  let query = supabase.from('User').select(`
    id,
    username,
    email,
    fullName,
    role,
    isActive,
    departmentId,
    department:Department(id, name),
    forms:Form(id),
    submissions:Submission(id),
    createdAt,
    updatedAt
  `);

  if (params?.departmentId) {
    query = query.eq('departmentId', params.departmentId);
  }

  if (params?.role) {
    query = query.eq('role', params.role);
  }

  if (params?.isActive !== undefined) {
    query = query.eq('isActive', params.isActive);
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    query = query.or(`username.ilike.%${s}%,fullName.ilike.%${s}%,email.ilike.%${s}%`);
  }

  query = query.order('createdAt', { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    departmentId: u.departmentId,
    department: normalizeDept(u.department),
    _count: {
      forms: u.forms?.length || 0,
      submissions: u.submissions?.length || 0,
    },
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
};

export const createUserApi = async (payload: CreateUserPayload): Promise<UserItem> => {
  const id = generateId('usr');
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(payload.password, 10);

  const { data, error } = await supabase
    .from('User')
    .insert({
      id,
      username: payload.username.trim(),
      email: payload.email.trim(),
      passwordHash,
      fullName: payload.fullName.trim(),
      role: payload.role,
      departmentId: payload.departmentId || null,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdAt: now,
      updatedAt: now,
    })
    .select(`
      id,
      username,
      email,
      fullName,
      role,
      isActive,
      departmentId,
      department:Department(id, name),
      createdAt,
      updatedAt
    `)
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new Error('ชื่อผู้ใช้ (username) หรืออีเมลนี้มีอยู่ในระบบแล้ว');
    }
    throw new Error(error?.message || 'ไม่สามารถสร้างผู้ใช้งานได้');
  }

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive,
    departmentId: data.departmentId,
    department: normalizeDept(data.department),
    _count: {
      forms: 0,
      submissions: 0,
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const updateUserApi = async (id: string, payload: UpdateUserPayload): Promise<UserItem> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('User')
    .update({
      email: payload.email.trim(),
      fullName: payload.fullName.trim(),
      role: payload.role,
      departmentId: payload.departmentId || null,
      isActive: payload.isActive,
      updatedAt: now,
    })
    .eq('id', id)
    .select(`
      id,
      username,
      email,
      fullName,
      role,
      isActive,
      departmentId,
      department:Department(id, name),
      forms:Form(id),
      submissions:Submission(id),
      createdAt,
      updatedAt
    `)
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new Error('อีเมลนี้มีผู้ใช้งานอื่นใช้อยู่แล้ว');
    }
    throw new Error(error?.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
  }

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive,
    departmentId: data.departmentId,
    department: normalizeDept(data.department),
    _count: {
      forms: data.forms?.length || 0,
      submissions: data.submissions?.length || 0,
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const toggleUserStatusApi = async (id: string, isActive: boolean): Promise<UserItem> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('User')
    .update({
      isActive,
      updatedAt: now,
    })
    .eq('id', id)
    .select(`
      id,
      username,
      email,
      fullName,
      role,
      isActive,
      departmentId,
      department:Department(id, name),
      forms:Form(id),
      submissions:Submission(id),
      createdAt,
      updatedAt
    `)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'ไม่สามารถเปลี่ยนสถานะผู้ใช้งานได้');
  }

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive,
    departmentId: data.departmentId,
    department: normalizeDept(data.department),
    _count: {
      forms: data.forms?.length || 0,
      submissions: data.submissions?.length || 0,
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const resetPasswordApi = async (id: string, newPassword: string): Promise<void> => {
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(newPassword, 10);

  const { error } = await supabase
    .from('User')
    .update({
      passwordHash,
      updatedAt: now,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
  }
};

export const deleteUserApi = async (id: string): Promise<{ message: string; action: string }> => {
  const { error } = await supabase.from('User').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      await supabase
        .from('User')
        .update({ isActive: false, updatedAt: new Date().toISOString() })
        .eq('id', id);
      return {
        message: 'ผู้ใช้มีข้อมูลแบบฟอร์มหรือคำตอบผูกอยู่ ระบบจึงเปลี่ยนสถานะเป็นปิดใช้งานแทนการลบ',
        action: 'deactivated',
      };
    }
    throw new Error(error.message || 'ไม่สามารถลบผู้ใช้งานได้');
  }

  return {
    message: 'ลบผู้ใช้งานเรียบร้อยแล้ว',
    action: 'deleted',
  };
};

export const lookupUsersApi = async (search?: string): Promise<UserLookupItem[]> => {
  let query = supabase
    .from('User')
    .select('id, username, fullName, department:Department(id, name)')
    .eq('isActive', true)
    .order('fullName', { ascending: true })
    .limit(30);

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`username.ilike.%${s}%,fullName.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'ไม่สามารถค้นหาผู้ใช้งานได้');
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    department: normalizeDept(u.department),
  }));
};
