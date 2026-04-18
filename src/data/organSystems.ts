import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Organ systems, bound to SNOMED CT body-system structure concepts.
// The `local` ID preserves backward compatibility with the original app data
// (so existing saved cases still resolve). The `snomed` coding is what goes
// into the semantic export.

export interface OrganSystemDef {
  local: string; // legacy ID used by existing SQLite rows
  label: string; // human-readable (preserved for UI)
  snomed: { code: string; display: string } | null;
}

export const ORGAN_SYSTEM_DEFS: OrganSystemDef[] = [
  { local: 'resp',    label: 'Respiratory',         snomed: { code: '20139000',  display: 'Respiratory system structure' } },
  { local: 'cvs',     label: 'Cardiovascular',      snomed: { code: '113257007', display: 'Structure of cardiovascular system' } },
  { local: 'neuro',   label: 'Neurological',        snomed: { code: '25087005',  display: 'Structure of nervous system' } },
  { local: 'renal',   label: 'Renal',               snomed: { code: '41572001',  display: 'Structure of urinary tract' } },
  { local: 'hepatic', label: 'Hepatic',             snomed: { code: '10200004',  display: 'Liver structure' } },
  { local: 'gi',      label: 'Gastrointestinal',    snomed: { code: '122865005', display: 'Structure of gastrointestinal tract' } },
  { local: 'haem',    label: 'Haematological',      snomed: { code: '122592007', display: 'Haematopoietic system structure' } },
  { local: 'endo',    label: 'Endocrine/Metabolic', snomed: { code: '113331007', display: 'Structure of endocrine system' } },
  { local: 'infect',  label: 'Infectious',          snomed: { code: '40733004',  display: 'Infectious disease' } },
  { local: 'msk',     label: 'Musculoskeletal',     snomed: { code: '26107004',  display: 'Structure of musculoskeletal system' } },
  { local: 'trauma',  label: 'Trauma',              snomed: { code: '417746004', display: 'Traumatic injury' } },
  { local: 'tox',     label: 'Toxicology',          snomed: { code: '75478009',  display: 'Poisoning' } },
  { local: 'other',   label: 'Other',               snomed: null },
];

export function organSystemToCoded(local: string): CodedValue | null {
  const def = ORGAN_SYSTEM_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
    };
  }
  // Fallback to app-local ontology for "Other" so every value is still
  // machine-readable; downstream consumers can filter these out.
  return {
    system: CODE_SYSTEMS.iculogbook,
    code: `organ-system/${def.local}`,
    display: def.label,
  };
}
