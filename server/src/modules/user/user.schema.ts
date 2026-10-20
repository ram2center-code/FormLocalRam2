import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  username: z
    .string({ required_error: 'กรุณากรอกชื่อผู้ใช้งาน' })
    .trim()
    .min(3, 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร')
    .max(50, 'ชื่อผู้ใช้งานต้องมีความยาวไม่เกิน 50 ตัวอักษร')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'ชื่อผู้ใช้งานสามารถใช้ตัวอักษรภาษาอังกฤษ ตัวเลข, จุด, ขีดล่าง หรือขีดกลางเท่านั้น'),
  email: z
    .string({ required_error: 'กรุณากรอกอีเมล' })
    .trim()
    .email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z
    .string({ required_error: 'กรุณากรอกรหัสผ่าน' })
    .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  fullName: z
    .string({ required_error: 'กรุณากรอกชื่อ-นามสกุล' })
    .trim()
    .min(2, 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร')
    .max(100, 'ชื่อ-นามสกุลต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'สิทธิ์การใช้งานต้องเป็น ADMIN หรือ USER' }) }),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  email: z
    .string({ required_error: 'กรุณากรอกอีเมล' })
    .trim()
    .email('รูปแบบอีเมลไม่ถูกต้อง'),
  fullName: z
    .string({ required_error: 'กรุณากรอกชื่อ-นามสกุล' })
    .trim()
    .min(2, 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร')
    .max(100, 'ชื่อ-นามสกุลต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'สิทธิ์การใช้งานต้องเป็น ADMIN หรือ USER' }) }),
  departmentId: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string({ required_error: 'กรุณากรอกรหัสผ่านใหม่' })
    .min(6, 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
});

export const toggleUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'กรุณาระบุสถานะการใช้งาน' }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
