import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';

export const ProcedureLogSchema = z.object({
  caseId: z.string().optional(),
  procedureType: z.string().min(1, 'Procedure type is required'),
  attempts: z.number().int().min(1, 'At least 1 attempt').max(20),
  success: z.boolean(),
  complications: z.string().max(1000).optional().or(z.literal('')),
});

export type ProcedureLogInput = z.infer<typeof ProcedureLogSchema>;

export interface ProcedureLog extends ProcedureLogInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;

  // ── Semantic layer ────────────────────────────────────────────────
  schemaVersion: string;
  procedureTypeCoded: import('./CodedValue').CodedValue;

  // ── Metadata / provenance ────────────────────────────────────────
  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullProcedureLogSchema = ProcedureLogSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  schemaVersion: z.string(),
  procedureTypeCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
