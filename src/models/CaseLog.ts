import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { SPECIALTY_LABELS } from '../data/specialties';

// ── Supervision ────────────────────────────────────────────────────────────
// 5-level ICM supervision scale (replaces the original 3-level EPA scale).
// Old values ('observed','supervised','unsupervised') are still accepted by
// the migration layer and mapped to the new scale on first read.
export const SupervisionLevelEnum = z.enum(SUPERVISION_LEVELS as [string, ...string[]]);
export type SupervisionLevel = z.infer<typeof SupervisionLevelEnum>;

// ── Patient demographics (no PII persisted) ────────────────────────────────
// DOB is NOT stored. Age is captured as a display string to support
// paediatric fractions (e.g. '1/52' = 1 week, '3/12' = 3 months, '4' = 4 years).
// This is a de-identification design choice: no DOB → no re-identification risk.
const AgeStringSchema = z
  .string()
  .max(20)
  .regex(
    /^(\d+\/(?:52|12)|(?:\d+(?:\.\d+)?))$/,
    "Age must be a number (years) or a fraction like '2/12' (months) or '1/52' (weeks)"
  )
  .optional()
  .or(z.literal(''));

// ── User-facing input schema ───────────────────────────────────────────────
export const CaseLogSchema = z.object({
  date: z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),

  // Patient demographics
  patientAge: AgeStringSchema,
  patientSex: z.enum(['M', 'F', 'Other', 'Unknown']).optional(),

  // Episode classification
  caseNumber: z.string().max(50).optional().or(z.literal('')),
  primarySpecialty: z.enum(SPECIALTY_LABELS as [string, ...string[]]).optional(),
  levelOfCare: z.enum(['1', '2', '3']).optional(),
  admitted: z.boolean().optional(),         // patient admitted to ICU/HDU this episode
  cardiacArrest: z.boolean().default(false),
  /** Major involvement / Minor involvement / Procedure-only */
  involvement: z.enum(['major', 'minor', 'procedure_only']).optional(),
  reviewedAgain: z.boolean().default(false), // this case was seen again on a subsequent shift

  // Diagnosis
  diagnosis: z.string().min(2, 'Diagnosis must be at least 2 characters').max(300),
  icd10Code: z.string().max(10).optional().or(z.literal('')),
  organSystems: z.array(z.string()).min(1, 'Select at least one organ system'),
  cobatriceDomains: z.array(z.string()).min(1, 'Select at least one CoBaTrICE domain'),

  // Outcomes
  outcome: z.enum([
    'survived_icu', 'survived_ward', 'died', 'withdrawn',
    'transferred_out', 'still_inpatient', 'unknown',
  ]).optional(),
  communicatedWithRelatives: z.boolean().default(false),

  // Teaching
  teachingDelivered: z.boolean().default(false),
  teachingRecipient: z.enum([
    'medical_student', 'fy', 'ct_st', 'nurse', 'allied_health', 'other',
  ]).optional(),

  // Supervision
  supervisionLevel: SupervisionLevelEnum,
  supervisorUserId: z.string().nullable().optional(),
  observerUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),

  notes: z.string().max(2000).optional().or(z.literal('')),
  reflection: z.string().max(2000).optional().or(z.literal('')),
});

export type CaseLogInput = z.infer<typeof CaseLogSchema>;

// ── On-disk / API shape ────────────────────────────────────────────────────
// Adds terminology-bound fields, provenance, quality, consent, licence, and
// schema version on top of the user's input.
export interface CaseLog extends CaseLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;

  // Approval
  approvedBy: string | null;
  approvedAt: string | null;

  // Sync bookkeeping
  deletedAt: string | null;
  conflict: boolean;
  syncRetryCount: number;
  syncLastError: string | null;

  // Semantic layer
  schemaVersion: string;
  diagnosisCoded: import('./CodedValue').CodedValue | null;
  organSystemsCoded: import('./CodedValue').CodedValue[];
  cobatriceDomainsCoded: import('./CodedValue').CodedValue[];
  supervisionLevelCoded: import('./CodedValue').CodedValue;
  specialtyCoded: import('./CodedValue').CodedValue | null;
  levelOfCareCoded: import('./CodedValue').CodedValue | null;
  outcomeCoded: import('./CodedValue').CodedValue | null;

  // Provenance / data governance
  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

// ── Validator for the full on-disk shape ───────────────────────────────────
export const FullCaseLogSchema = CaseLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  conflict: z.boolean(),
  syncRetryCount: z.number().int(),
  syncLastError: z.string().nullable(),
  schemaVersion: z.string(),
  diagnosisCoded: CodedValueSchema.nullable(),
  organSystemsCoded: z.array(CodedValueSchema),
  cobatriceDomainsCoded: z.array(CodedValueSchema),
  supervisionLevelCoded: CodedValueSchema,
  specialtyCoded: CodedValueSchema.nullable(),
  levelOfCareCoded: CodedValueSchema.nullable(),
  outcomeCoded: CodedValueSchema.nullable(),
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
