import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { INTUBATION_DEVICE_LABELS } from '../data/airwayItems';
import { RSI_INDUCTION_AGENTS, RSI_NEUROMUSCULAR_AGENTS, CORMACK_LEHANE_GRADES, DAE_ITEMS } from '../data/airwayItems';

// Airway management episode — one per intubation / airway event.
// Linked to a CaseLog via caseId (optional; can be standalone).

export const AirwayLogSchema = z.object({
  caseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // RSI / Induction
  isRsi: z.boolean().default(false),
  inductionAgent: z.enum(RSI_INDUCTION_AGENTS as [string, ...string[]]).optional(),
  inductionAgentOther: z.string().max(100).optional(),
  neuromuscularAgent: z.enum(RSI_NEUROMUSCULAR_AGENTS as [string, ...string[]]).optional(),
  neuromuscularAgentOther: z.string().max(100).optional(),

  // Intubation
  device: z.enum(INTUBATION_DEVICE_LABELS as [string, ...string[]]).optional(),
  tubeSize: z.number().min(4).max(10).optional(),     // mm ID
  tubeType: z.enum(['oral', 'nasal']).optional(),
  attempts: z.number().int().min(1).max(10).default(1),
  success: z.boolean().default(true),
  cormackLehaneGrade: z.enum(CORMACK_LEHANE_GRADES as [string, ...string[]]).optional(),

  // Difficult airway equipment used
  daeUsed: z.boolean().default(false),
  daeItems: z.array(z.string()).default([]),           // subset of DAE_ITEMS

  // Supervision
  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),

  notes: z.string().max(1000).optional(),
});

export type AirwayLogInput = z.infer<typeof AirwayLogSchema>;

export interface AirwayLog extends AirwayLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  // Semantic layer
  schemaVersion: string;
  deviceCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullAirwayLogSchema = AirwayLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  deviceCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
