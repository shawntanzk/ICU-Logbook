import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { ARTERIAL_LINE_SITE_LABELS } from '../data/arterialLineSites';

// Arterial line insertion episode.
// Linked to a CaseLog via caseId (optional; can be standalone).

export const ArterialLineLogSchema = z.object({
  caseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  site: z.enum(ARTERIAL_LINE_SITE_LABELS as [string, ...string[]]),
  ussGuided: z.boolean().default(false),
  attempts: z.number().int().min(1).max(20).default(1),
  success: z.boolean().default(true),
  complications: z.string().max(500).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type ArterialLineLogInput = z.infer<typeof ArterialLineLogSchema>;

export interface ArterialLineLog extends ArterialLineLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  schemaVersion: string;
  siteCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullArterialLineLogSchema = ArterialLineLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  siteCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
