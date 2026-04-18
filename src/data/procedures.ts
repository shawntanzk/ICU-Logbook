import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Procedure catalogue with SNOMED CT bindings. The `local` label is the
// existing human-facing string so saved rows still work; the SNOMED coding
// is the terminology-bound representation used in exports.

export interface ProcedureDef {
  local: string;
  snomed: { code: string; display: string } | null;
}

export const PROCEDURE_DEFS: ProcedureDef[] = [
  { local: 'Central Venous Catheter',    snomed: { code: '233547005', display: 'Insertion of central venous catheter' } },
  { local: 'Arterial Line',              snomed: { code: '392247006', display: 'Insertion of arterial catheter' } },
  { local: 'Endotracheal Intubation',    snomed: { code: '112798008', display: 'Insertion of endotracheal tube' } },
  { local: 'Bronchoscopy',               snomed: { code: '10847001',  display: 'Bronchoscopy' } },
  { local: 'Pleural Aspiration',         snomed: { code: '54690008',  display: 'Thoracentesis' } },
  { local: 'Chest Drain Insertion',      snomed: { code: '264957007', display: 'Insertion of chest tube' } },
  { local: 'Lumbar Puncture',            snomed: { code: '277762005', display: 'Lumbar puncture' } },
  { local: 'Paracentesis',               snomed: { code: '442301003', display: 'Abdominal paracentesis' } },
  { local: 'Nasogastric Tube',           snomed: { code: '165888003', display: 'Insertion of nasogastric tube' } },
  { local: 'Urinary Catheterisation',    snomed: { code: '55027006',  display: 'Urethral catheterization' } },
  { local: 'Tracheostomy',               snomed: { code: '48387007',  display: 'Tracheostomy' } },
  { local: 'Cardioversion / Defibrillation', snomed: { code: '180325003', display: 'Direct current cardioversion' } },
  { local: 'Intraosseous Access',        snomed: { code: '392188009', display: 'Intraosseous cannulation' } },
  { local: 'Pulmonary Artery Catheter',  snomed: { code: '18162001',  display: 'Insertion of Swan-Ganz catheter' } },
  { local: 'PICC Line',                  snomed: { code: '233553001', display: 'Insertion of peripherally inserted central catheter' } },
  { local: 'Ultrasound-guided Procedure', snomed: { code: '241511001', display: 'Ultrasound scan' } },
  { local: 'Other',                      snomed: null },
];

export function procedureToCoded(local: string): CodedValue | null {
  const def = PROCEDURE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
    };
  }
  return {
    system: CODE_SYSTEMS.iculogbook,
    code: `procedure/other`,
    display: def.local,
  };
}
