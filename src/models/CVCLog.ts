import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { CVC_SITE_LABELS } from '../data/cvcSites';

// Central venous catheter insertion episode.
// Linked to a CaseLog via caseId (optional; can be standalone).

export const CVCLogSchema = z.object({
  caseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  site: z.enum(CVC_SITE_LABELS as [string, ...string[]]),
  isSecondCVC: z.boolean().default(false),   // second CVC for same patient / same episode
  isVascath: z.boolean().default(false),     // dialysis/vascath catheter
  ussGuided: z.boolean().default(false),
  attempts: z.number().int().min(1).max(20).default(1),
  success: z.boolean().default(true),
  complications: z.string().max(500).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type CVCLogInput = z.infer<typeof CVCLogSchema>;

export interface CVCLog extends CVCLogInput {
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

export const FullCVCLogSchema = CVCLogSchema.extend({
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
