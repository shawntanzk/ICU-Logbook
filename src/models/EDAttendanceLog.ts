import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';

// Emergency Department attendance episode.
// Corresponds to the "ED" tab in the NW Deanery spreadsheet.

export const EDAttendanceLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  patientAge: z.string().max(20).optional(),
  patientSex: z.enum(['M', 'F', 'Other', 'Unknown']).optional(),

  diagnosis: z.string().min(2).max(300),
  icd10Code: z.string().max(10).optional().or(z.literal('')),

  /** Whether the patient required ICU/HDU admission from ED */
  icuAdmission: z.boolean().default(false),
  /** Presenting complaint category */
  presentingCategory: z.enum([
    'trauma', 'medical', 'surgical', 'obstetric',
    'paediatric', 'toxicological', 'psychiatric', 'other',
  ]).optional(),

  cardiacArrest: z.boolean().default(false),
  communicatedWithRelatives: z.boolean().default(false),

  cobatriceDomains: z.array(z.string()).default([]),
  reflection: z.string().max(2000).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type EDAttendanceLogInput = z.infer<typeof EDAttendanceLogSchema>;

export interface EDAttendanceLog extends EDAttendanceLogInput {
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

export const FullEDAttendanceLogSchema = EDAttendanceLogSchema.extend({
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
