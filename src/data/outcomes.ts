import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Patient outcome at point of ICU/ward episode completion.
// Maps to SNOMED discharge disposition codes and OAE adverse-event ontology
// for FAIR interoperability.

export type PatientOutcome =
  | 'survived_icu'       // discharged alive from ICU
  | 'survived_ward'      // discharged alive from ward / step-down
  | 'died'               // death during episode
  | 'withdrawn'          // care withdrawn / comfort measures
  | 'transferred_out'    // transferred to another unit / hospital
  | 'still_inpatient'    // ongoing inpatient at log entry time
  | 'unknown';

export interface OutcomeDef {
  local: PatientOutcome;
  label: string;
  snomed: { code: string; display: string } | null;
  oae?: { code: string; display: string };
  /** true when this outcome contributes to mortality statistics */
  isMortality: boolean;
}

export const OUTCOME_DEFS: OutcomeDef[] = [
  {
    local: 'survived_icu',
    label: 'Survived — Discharged from ICU',
    snomed: { code: '306689006', display: 'Discharge to home' },
    isMortality: false,
  },
  {
    local: 'survived_ward',
    label: 'Survived — Discharged from ward',
    snomed: { code: '306689006', display: 'Discharge to home' },
    isMortality: false,
  },
  {
    local: 'died',
    label: 'Died',
    snomed: { code: '419099009', display: 'Dead' },
    oae: { code: 'OAE_0000001', display: 'Death' },
    isMortality: true,
  },
  {
    local: 'withdrawn',
    label: 'Care withdrawn / Comfort measures',
    snomed: { code: '305351004', display: 'Admitted to ICU' }, // placeholder — no dedicated code
    oae: { code: 'OAE_0000001', display: 'Death' },
    isMortality: true,
  },
  {
    local: 'transferred_out',
    label: 'Transferred out',
    snomed: { code: '306691003', display: 'Discharge to nursing home' },
    isMortality: false,
  },
  {
    local: 'still_inpatient',
    label: 'Still inpatient',
    snomed: null,
    isMortality: false,
  },
  {
    local: 'unknown',
    label: 'Unknown',
    snomed: null,
    isMortality: false,
  },
];

export const OUTCOME_LABELS = OUTCOME_DEFS.map((d) => d.local);

export function outcomeToCoded(local: PatientOutcome): CodedValue | null {
  const def = OUTCOME_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [
        { system: CODE_SYSTEMS.icmOutcome, code: local, display: def.label },
        ...(def.oae ? [{ system: CODE_SYSTEMS.oae, code: def.oae.code, display: def.oae.display }] : []),
      ],
    };
  }
  return {
    system: CODE_SYSTEMS.icmOutcome,
    code: local,
    display: def.label,
  };
}

/** Whether the outcome counts towards mortality statistics. */
export function outcomeCounstAsMortality(local: PatientOutcome): boolean {
  return OUTCOME_DEFS.find((d) => d.local === local)?.isMortality ?? false;
}
