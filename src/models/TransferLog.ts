import { z } from 'zod';
import { CodedValueSchema } from './CodedValue';
import { ProvenanceSchema, QualitySchema, ConsentStatusEnum } from './Provenance';
import { SUPERVISION_LEVELS } from '../data/supervision';

// Inter-hospital or intra-hospital transfer episode.
// Corresponds to the "Transfers" tab in the NW Deanery spreadsheet.

export const TransferLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Patient demographics
  patientAge: z.string().max(20).optional(),
  patientSex: z.enum(['M', 'F', 'Other', 'Unknown']).optional(),

  diagnosis: z.string().min(2).max(300),
  icd10Code: z.string().max(10).optional().or(z.literal('')),

  transferType: z.enum(['inter_hospital', 'intra_hospital']).default('inter_hospital'),
  transferMode: z.enum(['land_ambulance', 'air_helicopter', 'air_fixed_wing', 'other']).default('land_ambulance'),

  fromLocation: z.string().max(200).optional(),  // hospital / ward
  toLocation: z.string().max(200).optional(),

  /** Level of care during transfer */
  levelOfCare: z.enum(['1', '2', '3']).optional(),

  /** Procedures performed during the transfer */
  proceduresDuringTransfer: z.array(z.string()).default([]),

  communicatedWithRelatives: z.boolean().default(false),
  reflection: z.string().max(2000).optional(),

  supervisionLevel: z.enum(SUPERVISION_LEVELS as [string, ...string[]]),
  supervisorUserId: z.string().nullable().optional(),
  externalSupervisorName: z.string().nullable().optional(),
});

export type TransferLogInput = z.infer<typeof TransferLogSchema>;

export interface TransferLog extends TransferLogInput {
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

  provenance: import('./Provenance').Provenance;
  quality: import('./Provenance').Quality;
  consentStatus: import('./Provenance').ConsentStatus;
  license: string;
}

export const FullTransferLogSchema = TransferLogSchema.extend({
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
  provenance: ProvenanceSchema,
  quality: QualitySchema,
  consentStatus: ConsentStatusEnum,
  license: z.string(),
});
