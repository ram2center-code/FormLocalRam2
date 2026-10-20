import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z
    .string({ required_error: 'กรุณากรอกชื่อแผนก' })
    .trim()
    .min(2, 'ชื่อแผนกต้องมีความยาวอย่างน้อย 2 ตัวอักษร')
    .max(100, 'ชื่อแผนกต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
});

export const updateDepartmentSchema = createDepartmentSchema;

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
