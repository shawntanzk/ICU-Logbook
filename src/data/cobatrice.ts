import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// CoBaTrICE top-level domains. Codes are the canonical domain numbers used
// by the CoBaTrICE syllabus (v2.0); displays are the published labels.
// Each domain resolves to an IRI under the app's published ontology, so a
// downstream buyer can dereference e.g. https://w3id.org/iculogbook/cobatrice/1
// and get a machine-readable description.

export interface CoBaTrICEDef {
  local: string; // existing local ID (d1…d12)
  number: number;
  label: string;
}

export const COBATRICE_DEFS: CoBaTrICEDef[] = [
  { local: 'd1',  number: 1,  label: 'Resuscitation & Acute Stabilisation' },
  { local: 'd2',  number: 2,  label: 'Diagnosis' },
  { local: 'd3',  number: 3,  label: 'Disease Management' },
  { local: 'd4',  number: 4,  label: 'Perioperative Care' },
  { local: 'd5',  number: 5,  label: 'Comfort & Recovery' },
  { local: 'd6',  number: 6,  label: 'End of Life Care' },
  { local: 'd7',  number: 7,  label: 'Paediatric Intensive Care' },
  { local: 'd8',  number: 8,  label: 'Transport' },
  { local: 'd9',  number: 9,  label: 'Organ Donation' },
  { local: 'd10', number: 10, label: 'Patient Safety & Quality' },
  { local: 'd11', number: 11, label: 'Professionalism' },
  { local: 'd12', number: 12, label: 'Regional Intensive Care' },
];

export function cobatriceToCoded(local: string): CodedValue | null {
  const def = COBATRICE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  return {
    system: CODE_SYSTEMS.cobatrice,
    code: String(def.number),
    display: def.label,
  };
}
