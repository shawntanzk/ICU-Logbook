/**
 * Zod validation schema for CaseLog
 */
import { z } from 'zod';

const SUPERVISION_LEVELS = ['observed', 'supervised', 'unsupervised'] as const;
const COBATRICE_DOMAINS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12'] as const;
const ORGAN_SYSTEMS = ['resp', 'cardio', 'neuro', 'gi', 'gu', 'endo', 'trauma', 'infect', 'other'] as const;

export const CaseLogSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  supervisorUserId: z.string().uuid().nullable(),
  observerUserId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  icd10Code: z.string().nullable(),
  organSystems: z.array(z.enum(ORGAN_SYSTEMS)),
  cobatriceDomains: z.array(z.enum(COBATRICE_DOMAINS)),
  supervisionLevel: z.enum(SUPERVISION_LEVELS),
  reflection: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  synced: z.boolean(),
  conflict: z.boolean().optional(),
  externalSupervisorName: z.string().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
});

export type CaseLog = z.infer<typeof CaseLogSchema>;
