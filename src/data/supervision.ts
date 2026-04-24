import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// ICM 5-level supervision scale used by the Mark Tan NW Deanery logbook
// (and mirrored in the RCoA/FICM training framework). Each level maps to
// the corresponding Ottawa Entrustment scale EPA level for interoperability.
//
// Canonical URIs are under the app ontology namespace with a formal
// `skos:exactMatch` to the Ottawa scale so they survive future terminology
// migrations.

export type ICMSupervisionLevel =
  | 'immediate'   // supervisor in the room / at the bedside
  | 'local'       // supervisor immediately available (same floor / theatre suite)
  | 'distant'     // supervisor on-call, contactable within minutes
  | 'leading'     // trainee leads, supervisor informed but not present
  | 'supervising'; // trainee acts as supervising consultant (senior trainees)

export interface SupervisionDef {
  local: ICMSupervisionLevel;
  epaLevel: 1 | 2 | 3 | 4 | 5;
  label: string;
  shortLabel: string; // used in compact table cells
  description: string;
  // SNOMED code for the supervision modality where one exists.
  snomedCode?: string;
}

export const SUPERVISION_DEFS: SupervisionDef[] = [
  {
    local: 'immediate',
    epaLevel: 1,
    label: 'Immediate',
    shortLabel: 'Imm',
    description: 'Supervisor directly present and participating in the activity.',
    snomedCode: '445773001', // Direct supervision (observable entity)
  },
  {
    local: 'local',
    epaLevel: 2,
    label: 'Local',
    shortLabel: 'Local',
    description: 'Supervisor immediately available in the same clinical area.',
    snomedCode: '445772006', // Indirect supervision
  },
  {
    local: 'distant',
    epaLevel: 3,
    label: 'Distant',
    shortLabel: 'Dist',
    description: 'Supervisor contactable and able to attend within minutes.',
  },
  {
    local: 'leading',
    epaLevel: 4,
    label: 'Leading',
    shortLabel: 'Lead',
    description: 'Trainee leads independently; supervisor informed retrospectively.',
  },
  {
    local: 'supervising',
    epaLevel: 5,
    label: 'Supervising',
    shortLabel: 'Sup',
    description: 'Trainee acts as the supervising consultant for junior staff.',
  },
];

export const SUPERVISION_LEVELS = SUPERVISION_DEFS.map((d) => d.local);

export function supervisionToCoded(local: string): CodedValue | null {
  const def = SUPERVISION_DEFS.find((d) => d.local === local);
  if (!def) return null;
  return {
    system: CODE_SYSTEMS.icmSupervision,
    code: String(def.epaLevel),
    display: def.label,
    mappings: [
      // Ottawa EPA cross-mapping
      {
        system: CODE_SYSTEMS.ottawaEpa,
        code: String(def.epaLevel),
        display: `Ottawa EPA level ${def.epaLevel}`,
      },
      // SNOMED cross-mapping where available
      ...(def.snomedCode
        ? [{ system: CODE_SYSTEMS.snomed, code: def.snomedCode, display: def.label }]
        : []),
    ],
  };
}

export function supervisionLabel(local: ICMSupervisionLevel): string {
  return SUPERVISION_DEFS.find((d) => d.local === local)?.label ?? local;
}

/** Short labels for compact UI (e.g. table cells, chips). */
export function supervisionShortLabel(local: ICMSupervisionLevel): string {
  return SUPERVISION_DEFS.find((d) => d.local === local)?.shortLabel ?? local;
}
