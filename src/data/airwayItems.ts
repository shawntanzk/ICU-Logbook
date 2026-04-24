import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Airway management data: RSI drug options, intubation devices, DAE kit,
// Cormack-Lehane grades. Mirrors the airway columns in the NW Deanery logbook.

// ── RSI / Induction agents ────────────────────────────────────────────────

export const RSI_INDUCTION_AGENTS = [
  'Ketamine',
  'Propofol',
  'Thiopental',
  'Etomidate',
  'Midazolam',
  'Other',
] as const;

export const RSI_NEUROMUSCULAR_AGENTS = [
  'Suxamethonium',
  'Rocuronium',
  'Vecuronium',
  'Atracurium',
  'None (awake / sedation only)',
  'Other',
] as const;

// ── Intubation device ──────────────────────────────────────────────────────

export interface IntubationDeviceDef {
  local: string;
  snomed: { code: string; display: string } | null;
  isVideolaryngoscope: boolean;
}

export const INTUBATION_DEVICE_DEFS: IntubationDeviceDef[] = [
  { local: 'Macintosh laryngoscope',   snomed: { code: '465813008', display: 'Laryngoscope' },           isVideolaryngoscope: false },
  { local: 'McCoy laryngoscope',       snomed: { code: '465813008', display: 'Laryngoscope' },           isVideolaryngoscope: false },
  { local: 'C-MAC videolaryngoscope',  snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'McGrath videolaryngoscope',snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'Glidescope',              snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'King Vision',             snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'Flexible nasendoscope',   snomed: { code: '10847001',  display: 'Fibreoptic bronchoscope' },isVideolaryngoscope: false },
  { local: 'Airtraq',                 snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'Storz CMAC',             snomed: { code: '462932009', display: 'Video laryngoscope' },     isVideolaryngoscope: true },
  { local: 'Other',                   snomed: null,                                                      isVideolaryngoscope: false },
];

export const INTUBATION_DEVICE_LABELS = INTUBATION_DEVICE_DEFS.map((d) => d.local);

// ── Cormack-Lehane grade ──────────────────────────────────────────────────

export type CormackLehaneGrade = '1' | '2a' | '2b' | '3a' | '3b' | '4';

export const CORMACK_LEHANE_GRADES: CormackLehaneGrade[] = ['1', '2a', '2b', '3a', '3b', '4'];

// ── Difficult airway equipment (DAE) ──────────────────────────────────────

export const DAE_ITEMS = [
  'Bougie / Introducer',
  'Video laryngoscope',
  'Flexible nasendoscope',
  'Supraglottic airway (LMA rescue)',
  'Surgical airway (front-of-neck)',
  'Jet ventilation',
  'Other',
] as const;

// ── Coded value helpers ───────────────────────────────────────────────────

export function intubationDeviceToCoded(local: string): CodedValue | null {
  const def = INTUBATION_DEVICE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [{ system: CODE_SYSTEMS.icmAirway, code: local, display: local }],
    };
  }
  return { system: CODE_SYSTEMS.icmAirway, code: 'device/other', display: local };
}
