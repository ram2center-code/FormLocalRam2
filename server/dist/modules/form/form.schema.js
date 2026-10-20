import { z } from 'zod';
import { FormType, FormVisibility } from '@prisma/client';
export const fieldTypeEnum = z.enum([
    'text',
    'textarea',
    'number',
    'single_choice',
    'multi_choice',
    'dropdown',
    'date',
    'rating',
    'file',
    'layer_box',
]);
export const formFieldOptionSchema = z.object({
    id: z.string(),
    label: z.string().trim().min(1, 'ตัวเลือกต้องไม่เป็นค่าว่าง'),
});
export const formFieldSchema = z.object({
    id: z.string(),
    type: fieldTypeEnum,
    label: z.string().trim().min(1, 'กรุณาระบุหัวข้อคำถามหรือชื่อกล่อง'),
    description: z.string().optional(),
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
    options: z.array(formFieldOptionSchema).optional(),
    points: z.number().min(0).optional(),
    correctAnswer: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
    layerId: z.string().nullable().optional(),
    colSpan: z.number().int().min(1).max(24).optional().default(24),
    columns: z.number().int().min(1).max(4).optional().default(2),
});
export const gradeBandSchema = z.object({
    label: z.string(),
    minScore: z.number(),
});
export const scoreConfigSchema = z.object({
    passScore: z.number().min(0).default(50),
    passType: z.enum(['percent', 'points']).default('percent'),
    showResultToUser: z.boolean().default(true),
    gradeBands: z.array(gradeBandSchema).optional(),
});
export const createFormSchema = z.object({
    title: z
        .string({ required_error: 'กรุณากรอกชื่อแบบฟอร์ม' })
        .trim()
        .min(2, 'ชื่อแบบฟอร์มต้องมีความยาวอย่างน้อย 2 ตัวอักษร')
        .max(200, 'ชื่อแบบฟอร์มต้องมีความยาวไม่เกิน 200 ตัวอักษร'),
    description: z.string().optional(),
    type: z.nativeEnum(FormType).default(FormType.GENERAL),
    visibility: z.nativeEnum(FormVisibility).default(FormVisibility.PRIVATE),
    departmentId: z.string().nullable().optional(),
    isAcceptingResponses: z.boolean().optional().default(true),
    requireLogin: z.boolean().optional().default(true),
    pdpaEnabled: z.boolean().optional().default(false),
    pdpaTitle: z.string().nullable().optional(),
    pdpaContent: z.string().nullable().optional(),
    openAt: z.string().datetime({ offset: true }).nullable().optional(),
    closeAt: z.string().datetime({ offset: true }).nullable().optional(),
    allowMultiple: z.boolean().optional().default(true),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    schema: z.array(formFieldSchema).default([]),
    scoreConfig: scoreConfigSchema.optional(),
});
export const updateFormSchema = z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().optional(),
    type: z.nativeEnum(FormType).optional(),
    visibility: z.nativeEnum(FormVisibility).optional(),
    departmentId: z.string().nullable().optional(),
    requireLogin: z.boolean().optional(),
    pdpaEnabled: z.boolean().optional(),
    pdpaTitle: z.string().nullable().optional(),
    pdpaContent: z.string().nullable().optional(),
    schema: z.array(formFieldSchema).optional(),
    scoreConfig: scoreConfigSchema.optional(),
});
export const updateFormSettingsSchema = z.object({
    isAcceptingResponses: z.boolean().optional(),
    requireLogin: z.boolean().optional(),
    pdpaEnabled: z.boolean().optional(),
    pdpaTitle: z.string().nullable().optional(),
    pdpaContent: z.string().nullable().optional(),
    openAt: z.string().datetime({ offset: true }).nullable().optional(),
    closeAt: z.string().datetime({ offset: true }).nullable().optional(),
    allowMultiple: z.boolean().optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    visibility: z.nativeEnum(FormVisibility).optional(),
    departmentId: z.string().nullable().optional(),
});
export const publishFormSchema = z.object({
    schema: z.array(formFieldSchema).min(1, 'แบบฟอร์มต้องมีคำถามอย่างน้อย 1 ข้อก่อนเผยแพร่'),
    scoreConfig: scoreConfigSchema.optional(),
});
export const shareFormSchema = z.object({
    userIds: z.array(z.string()).min(1, 'กรุณาระบุผู้ใช้ที่ต้องการแชร์ให้'),
});
export const submitFormSchema = z.object({
    answers: z.record(z.any(), { required_error: 'กรุณาส่งข้อมูลคำตอบ' }),
    pdpaConsent: z.boolean().optional().default(false),
});
