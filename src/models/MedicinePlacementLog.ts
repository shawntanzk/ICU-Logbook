import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';
import { SPECIALTY_LABELS } from '../data/specialties';

// Medicine / out-of-ICU placement episode.
// Corresponds to the "Medicine" tab in the NW Deanery spreadsheet.
// Records placements in general medical or specialist wards / clinics
// that count towards the overall training portfolio.

export const MedicinePlacementLogSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  specialty: z.enum(SPECIALTY_LABELS as [string, ...string[]]),
  hospital: z.string().max(200).optional(),
  ward: z.string().max(200).optional(),

  /** Number of patients managed during the placement. */
  patientCount: z.number().int().min(0).optional(),
  /** Whether a formal teaching session was delivered. */
  teachingDelivered: z.boolean().default(false),
  teachingRecipient: z.enum([
    'medical_student', 'fy', 'ct_st', 'nurse', 'allied_health', 'other',
  ]).optional(),

  cobatriceDomains: z.array(z.string()).default([]),
  reflection: z.string().max(2000).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type MedicinePlacementLogInput = z.infer<typeof MedicinePlacementLogSchema>;

export interface MedicinePlacementLog extends MedicinePlacementLogInput {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  deletedAt: string | null;

  schemaVersion: string;
  specialtyCoded: import('./CodedValue').CodedValue | null;
  supervisionLevelCoded: import('./CodedValue').CodedValue;
  cobatriceDomainsCoded: import('./CodedValue').CodedValue[];

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullMedicinePlacementLogSchema = MedicinePlacementLogSchema.extend({
  id: z.string(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  schemaVersion: z.string(),
  specialtyCoded: CodedValueSchema.nullable(),
  supervisionLevelCoded: CodedValueSchema,
  cobatriceDomainsCoded: z.array(CodedValueSchema),
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
