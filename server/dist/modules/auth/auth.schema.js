import { z } from 'zod';
export const loginSchema = z.object({
    username: z
        .string({ required_error: 'กรุณากรอกชื่อผู้ใช้งาน' })
        .trim()
        .min(3, 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร'),
    password: z
        .string({ required_error: 'กรุณากรอกรหัสผ่าน' })
        .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
});
