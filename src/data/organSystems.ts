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
  uberon: { code: string; display: string } | null; // OBO anatomy — Monarch KG join key
}

// Organ systems, bound to SNOMED CT (body-structure) and UBERON (OBO anatomy).
// UBERON is what makes these joinable with the Monarch Initiative KG and
// any other OBO-aligned resource; SNOMED CT is what FHIR consumers expect.
export const ORGAN_SYSTEM_DEFS: OrganSystemDef[] = [
  { local: 'resp',    label: 'Respiratory',         snomed: { code: '20139000',  display: 'Respiratory system structure' },           uberon: { code: 'UBERON:0001004', display: 'respiratory system' } },
  { local: 'cvs',     label: 'Cardiovascular',      snomed: { code: '113257007', display: 'Structure of cardiovascular system' },     uberon: { code: 'UBERON:0004535', display: 'cardiovascular system' } },
  { local: 'neuro',   label: 'Neurological',        snomed: { code: '25087005',  display: 'Structure of nervous system' },            uberon: { code: 'UBERON:0001016', display: 'nervous system' } },
  { local: 'renal',   label: 'Renal',               snomed: { code: '41572001',  display: 'Structure of urinary tract' },             uberon: { code: 'UBERON:0001008', display: 'renal system' } },
  { local: 'hepatic', label: 'Hepatic',             snomed: { code: '10200004',  display: 'Liver structure' },                        uberon: { code: 'UBERON:0002423', display: 'hepatobiliary system' } },
  { local: 'gi',      label: 'Gastrointestinal',    snomed: { code: '122865005', display: 'Structure of gastrointestinal tract' },    uberon: { code: 'UBERON:0001555', display: 'digestive tract' } },
  { local: 'haem',    label: 'Haematological',      snomed: { code: '122592007', display: 'Haematopoietic system structure' },        uberon: { code: 'UBERON:0002193', display: 'hemolymphoid system' } },
  { local: 'endo',    label: 'Endocrine/Metabolic', snomed: { code: '113331007', display: 'Structure of endocrine system' },          uberon: { code: 'UBERON:0000949', display: 'endocrine system' } },
  { local: 'infect',  label: 'Infectious',          snomed: { code: '40733004',  display: 'Infectious disease' },                     uberon: null },
  { local: 'msk',     label: 'Musculoskeletal',     snomed: { code: '26107004',  display: 'Structure of musculoskeletal system' },    uberon: { code: 'UBERON:0002204', display: 'musculoskeletal system' } },
  { local: 'trauma',  label: 'Trauma',              snomed: { code: '417746004', display: 'Traumatic injury' },                       uberon: null },
  { local: 'tox',     label: 'Toxicology',          snomed: { code: '75478009',  display: 'Poisoning' },                              uberon: null },
  { local: 'other',   label: 'Other',               snomed: null,                                                                     uberon: null },
];

export function organSystemToCoded(local: string): CodedValue | null {
  const def = ORGAN_SYSTEM_DEFS.find((d) => d.local === local);
  if (!def) return null;

  // SNOMED is primary; UBERON attaches as a mapping so Monarch/OBO consumers
  // can follow it without the FHIR profile needing to change.
  const mappings: CodedValue['mappings'] = [];
  if (def.uberon) {
    mappings.push({
      system: CODE_SYSTEMS.uberon,
      code: def.uberon.code,
      display: def.uberon.display,
    });
  }

  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: mappings.length > 0 ? mappings : undefined,
    };
  }
  return {
    system: CODE_SYSTEMS.iculogbook,
    code: `organ-system/${def.local}`,
    display: def.label,
    mappings: mappings.length > 0 ? mappings : undefined,
  };
}
