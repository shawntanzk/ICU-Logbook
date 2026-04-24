import { z } from 'zod';

// PROV-O compatible provenance snapshot captured at record creation time.
// Lives alongside each record in SQLite and is emitted inside FHIR
// Provenance / PROV-O Activity resources during export.

export const ProvenanceSchema = z.object({
  appVersion: z.string(),       // semver of the logbook app
  schemaVersion: z.string(),    // semver of the data schema the record uses
  deviceId: z.string(),         // locally-generated, per-install
  platform: z.enum(['ios', 'android', 'web']),
  locale: z.string(),           // BCP-47
  timezone: z.string(),         // IANA tz (e.g. Europe/London)
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

// Consent states. "anonymous" is the default on first launch — only fully
// anonymised aggregate views may include the record. Upgrading to "research"
// permits richer feature extraction but still no PII (app captures none).
// "none" blocks the record from any export pipeline.

export const ConsentStatusEnum = z.enum(['none', 'anonymous', 'research', 'commercial']);
export type ConsentStatus = z.infer<typeof ConsentStatusEnum>;

// SPDX licence identifier applied at export time. Per-record so future tiers
// can mix licences (e.g. CC0 for anonymised, CC-BY-NC for research).
export const DEFAULT_LICENSE = 'CC-BY-NC-4.0';

// Quality scores computed from the record at save-time. Surface in the
// export so buyers can filter on completeness/confidence.
export const QualitySchema = z.object({
  completeness: z.number().min(0).max(1),
  codingConfidence: z.number().min(0).max(1),
});
export type Quality = z.infer<typeof QualitySchema>;

// Semver of the on-disk data schema. Bump when the shape of saved rows
// changes in a non-backward-compatible way.
// 3.0.0 — full parity redesign: 5-level supervision, demographics, specialty,
//          level of care, outcome, sub-entity tables (airway, art line, CVC,
//          USS, regional block, ward review, transfer, ED, medicine placement).
export const CURRENT_SCHEMA_VERSION = '3.0.0';
