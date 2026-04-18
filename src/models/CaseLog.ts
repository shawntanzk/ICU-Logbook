import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';

export const SupervisionLevelEnum = z.enum(['observed', 'supervised', 'unsupervised']);
export type SupervisionLevel = z.infer<typeof SupervisionLevelEnum>;

// User-facing input — stays compact so the AddCase form can stay simple.
// Coded values are derived at save-time from the local IDs using the data
// modules in `src/data/`.
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

// On-disk / API shape. Adds terminology-bound fields, provenance, quality,
// consent, licence, and schema version on top of the user's input.
export interface CaseLog extends CaseLogInput {
  id: string;              // UUID (IRI derived via caseIRI() at export)
  createdAt: string;
  updatedAt: string;
  synced: boolean;

  // ── Semantic layer ────────────────────────────────────────────────
  schemaVersion: string;
  diagnosisCoded: import('./CodedValue').CodedValue | null; // null if free-text only
  organSystemsCoded: import('./CodedValue').CodedValue[];
  cobatriceDomainsCoded: import('./CodedValue').CodedValue[];
  supervisionLevelCoded: import('./CodedValue').CodedValue;

  // ── Metadata / provenance ────────────────────────────────────────
  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string; // SPDX identifier
}

// Validator for the full on-disk shape — used when reading from storage
// or validating incoming sync payloads.
export const FullCaseLogSchema = CaseLogSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  schemaVersion: z.string(),
  diagnosisCoded: CodedValueSchema.nullable(),
  organSystemsCoded: z.array(CodedValueSchema),
  cobatriceDomainsCoded: z.array(CodedValueSchema),
  supervisionLevelCoded: CodedValueSchema,
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
