import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Maps the app's three supervision levels to the Ottawa Entrustment Scale
// (EPA levels 1–5). Canonical URIs are published under the app ontology
// namespace with a formal `skos:exactMatch` to the Ottawa scale so they
// survive future terminology migrations.

export interface SupervisionDef {
  local: 'observed' | 'supervised' | 'unsupervised';
  epaLevel: number; // 1–5
  label: string;
  description: string;
}

export const SUPERVISION_DEFS: SupervisionDef[] = [
  {
    local: 'observed',
    epaLevel: 1,
    label: 'Observed',
    description: 'Observation only — trainee watches the consultant perform',
  },
  {
    local: 'supervised',
    epaLevel: 3,
    label: 'Supervised',
    description: 'Indirect supervision — consultant immediately available',
  },
  {
    local: 'unsupervised',
    epaLevel: 4,
    label: 'Unsupervised',
    description: 'Independent practice with retrospective review',
  },
];

export function supervisionToCoded(local: string): CodedValue | null {
  const def = SUPERVISION_DEFS.find((d) => d.local === local);
  if (!def) return null;
  return {
    system: CODE_SYSTEMS.ottawaEpa,
    code: String(def.epaLevel),
    display: def.label,
  };
}
