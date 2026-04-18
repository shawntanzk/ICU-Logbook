import { z } from 'zod';

export const SupervisionLevelEnum = z.enum(['observed', 'supervised', 'unsupervised']);
export type SupervisionLevel = z.infer<typeof SupervisionLevelEnum>;

export const CaseLogSchema = z.object({
  date: z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  diagnosis: z.string().min(2, 'Diagnosis must be at least 2 characters').max(300),
  icd10Code: z.string().max(10).optional().or(z.literal('')),
  organSystems: z.array(z.string()).min(1, 'Select at least one organ system'),
  cobatriceDomains: z.array(z.string()).min(1, 'Select at least one CoBaTrICE domain'),
  supervisionLevel: SupervisionLevelEnum,
  reflection: z.string().max(2000).optional().or(z.literal('')),
});

export type CaseLogInput = z.infer<typeof CaseLogSchema>;

export interface CaseLog extends CaseLogInput {
  id: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  synced: boolean;   // false until pushed to backend
}
