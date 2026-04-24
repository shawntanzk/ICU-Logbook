import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Level of care classification — matches the FICM / NHS England Levels 1–3
// (equivalent to Step-Down / HDU / ICU in common parlance).
// SNOMED codes from the "Levels of critical care" hierarchy.

export type LevelOfCare = '1' | '2' | '3';

export interface LevelOfCareDef {
  level: LevelOfCare;
  label: string;
  description: string;
  snomed: { code: string; display: string };
  nci?: { code: string; display: string };
}

export const LEVEL_OF_CARE_DEFS: LevelOfCareDef[] = [
  {
    level: '1',
    label: 'Level 1 — Ward (enhanced monitoring)',
    description: 'Patients at risk of deterioration, or recently relocated from higher care. Managed on a general ward with additional monitoring.',
    snomed: { code: '305351004', display: 'Admitted to ICU' }, // closest available
    nci:   { code: 'C53511', display: 'Step-Down Care' },
  },
  {
    level: '2',
    label: 'Level 2 — HDU (single-organ support)',
    description: 'High Dependency Unit. Single-organ failure or support. More detailed monitoring and nursing ratio than ward.',
    snomed: { code: '305352006', display: 'Admitted to HDU' },
    nci:   { code: 'C53510', display: 'Intermediate Care' },
  },
  {
    level: '3',
    label: 'Level 3 — ICU (multi-organ support)',
    description: 'Intensive Care Unit. Two or more organ failures, including at least basic respiratory support.',
    snomed: { code: '305353001', display: 'Admitted to ICU with ventilation' },
    nci:   { code: 'C14234', display: 'Intensive Care' },
  },
];

export const LEVEL_OF_CARE_LABELS: LevelOfCare[] = ['1', '2', '3'];

export function levelOfCareToCoded(level: LevelOfCare): CodedValue {
  const def = LEVEL_OF_CARE_DEFS.find((d) => d.level === level)!;
  return {
    system: CODE_SYSTEMS.icmLevelOfCare,
    code: level,
    display: def.label,
    mappings: [
      { system: CODE_SYSTEMS.snomed, code: def.snomed.code, display: def.snomed.display },
      ...(def.nci ? [{ system: CODE_SYSTEMS.nci, code: def.nci.code, display: def.nci.display }] : []),
    ],
  };
}
