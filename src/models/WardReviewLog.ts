import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { SPECIALTY_LABELS } from '../data/specialties';

// Ward review episode — corresponds to the "Ward Review" tab in the
// NW Deanery spreadsheet. Records reviews of patients on general wards
// who are at risk or being considered for escalation to critical care.

export const WardReviewLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Patient demographics (no PII stored — DOB as age proxy only)
  patientAge: z.string().max(20).optional(),   // e.g. '45', '2/12', '6/52'
  patientSex: z.enum(['M', 'F', 'Other', 'Unknown']).optional(),

  referringSpecialty: z.enum(SPECIALTY_LABELS as [string, ...string[]]).optional(),
  diagnosis: z.string().min(2).max(300),
  icd10Code: z.string().max(10).optional().or(z.literal('')),

  /** Outcome of the review (escalated, not escalated, advice given). */
  reviewOutcome: z.enum(['escalated_icu', 'escalated_hdu', 'not_escalated', 'advice_only', 'other']).default('advice_only'),
  communicatedWithRelatives: z.boolean().default(false),

  cobatriceDomains: z.array(z.string()).default([]),
  reflection: z.string().max(2000).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type WardReviewLogInput = z.infer<typeof WardReviewLogSchema>;

export interface WardReviewLog extends WardReviewLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  schemaVersion: string;
  diagnosisCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;
  cobatriceDomainsCoded: import('./CodedValue').CodedValue[];

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullWardReviewLogSchema = WardReviewLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  diagnosisCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  cobatriceDomainsCoded: z.array(CodedValueSchema),
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
