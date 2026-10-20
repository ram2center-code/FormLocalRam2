import { supabase } from '../../../lib/supabase';
import { generateId } from '../../../lib/id';

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
  const { data, error } = await supabase
    .from('Department')
    .select(`
      id,
      name,
      createdAt,
      updatedAt,
      users:User(id),
      forms:Form(id)
    `)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลแผนกได้');
  }

  return (data || []).map((dept: any) => ({
    id: dept.id,
    name: dept.name,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
    _count: {
      users: dept.users?.length || 0,
      forms: dept.forms?.length || 0,
    },
  }));
};

export const createDepartmentApi = async (name: string): Promise<DepartmentItem> => {
  const trimmedName = name.trim();
  const id = generateId('dept');
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('Department')
    .insert({
      id,
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new Error(`ชื่อแผนก "${trimmedName}" มีอยู่ในระบบแล้ว`);
    }
    throw new Error(error?.message || 'ไม่สามารถสร้างแผนกได้');
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    _count: {
      users: 0,
      forms: 0,
    },
  };
};

export const updateDepartmentApi = async (id: string, name: string): Promise<DepartmentItem> => {
  const trimmedName = name.trim();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('Department')
    .update({
      name: trimmedName,
      updatedAt: now,
    })
    .eq('id', id)
    .select(`
      id,
      name,
      createdAt,
      updatedAt,
      users:User(id),
      forms:Form(id)
    `)
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new Error(`ชื่อแผนก "${trimmedName}" มีอยู่ในระบบแล้ว`);
    }
    throw new Error(error?.message || 'ไม่สามารถแก้ไขแผนกได้');
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    _count: {
      users: data.users?.length || 0,
      forms: data.forms?.length || 0,
    },
  };
};

export const deleteDepartmentApi = async (id: string): Promise<void> => {
  const { error } = await supabase.from('Department').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'ไม่สามารถลบแผนกได้');
  }
};
