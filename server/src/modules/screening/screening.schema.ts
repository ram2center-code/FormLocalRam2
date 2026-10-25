import { z } from 'zod';

export const createScreeningRecordSchema = z.object({
  recordId: z.string().optional().nullable(),
  hn: z.string().optional().nullable(),
  patientName: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  assessmentDate: z.string().optional().nullable(),
  ageYears: z.number().int().optional().nullable(),
  ageMonths: z.number().int().optional().nullable(),
  totalAgeMonths: z.number().int().optional().nullable(),
  screenings: z.record(z.any()),
  hasAlert: z.boolean().optional().default(false),
  hasSuicideRisk: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
});

export type CreateScreeningRecordInput = z.infer<typeof createScreeningRecordSchema>;
