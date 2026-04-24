import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { USS_STUDY_TYPE_LABELS } from '../data/ussStudyTypes';

// Point-of-care ultrasound study episode.
// Linked to a CaseLog via caseId (optional; can be standalone).
// The spreadsheet allows up to 2 USS studies per case row; the app stores
// each as a separate USSLog and links them by caseId.

export const USSLogSchema = z.object({
  caseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  studyType: z.enum(USS_STUDY_TYPE_LABELS as [string, ...string[]]),
  /** True if the trainee performed the scan; false if they observed. */
  performed: z.boolean().default(true),
  /** Formal report / image submitted (e.g. for FICE accreditation). */
  formalReport: z.boolean().default(false),
  findings: z.string().max(500).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type USSLogInput = z.infer<typeof USSLogSchema>;

export interface USSLog extends USSLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  schemaVersion: string;
  studyTypeCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullUSSLogSchema = USSLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  studyTypeCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
