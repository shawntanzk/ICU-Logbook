import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { REGIONAL_BLOCK_LABELS } from '../data/regionalBlocks';

// Regional anaesthesia / nerve block episode.
// Linked to a CaseLog via caseId (optional; can be standalone).

export const RegionalBlockLogSchema = z.object({
  caseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  blockType: z.enum(REGIONAL_BLOCK_LABELS as [string, ...string[]]),
  blockTypeOther: z.string().max(100).optional(), // used when blockType === 'Other nerve block'
  ussGuided: z.boolean().default(true),
  catheter: z.boolean().default(false),           // continuous catheter technique
  attempts: z.number().int().min(1).max(10).default(1),
  success: z.boolean().default(true),
  complications: z.string().max(500).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type RegionalBlockLogInput = z.infer<typeof RegionalBlockLogSchema>;

export interface RegionalBlockLog extends RegionalBlockLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  schemaVersion: string;
  blockTypeCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullRegionalBlockLogSchema = RegionalBlockLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  blockTypeCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
