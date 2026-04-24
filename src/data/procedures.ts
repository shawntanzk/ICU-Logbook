import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Procedure catalogue with SNOMED CT and NCIT bindings.
// Covers all procedure types tracked in the NW Deanery ICM logbook.

export interface ProcedureDef {
  local: string;
  snomed: { code: string; display: string } | null;
  nci?: { code: string; display: string };
  /** Category for grouping in forms and dashboard. */
  category: 'airway' | 'vascular_access' | 'respiratory' | 'cardiovascular' | 'neurological' | 'renal' | 'abdominal' | 'imaging' | 'resuscitation' | 'other';
}

export const PROCEDURE_DEFS: ProcedureDef[] = [
  // ── Airway ────────────────────────────────────────────────────────────────
  { local: 'Endotracheal Intubation',          category: 'airway',          snomed: { code: '112798008', display: 'Insertion of endotracheal tube' } },
  { local: 'Rapid Sequence Intubation (RSI)',  category: 'airway',          snomed: { code: '16883004',  display: 'Endotracheal intubation, rapid sequence' } },
  { local: 'Awake Fibreoptic Intubation',      category: 'airway',          snomed: { code: '232674003', display: 'Awake fibreoptic intubation' } },
  { local: 'Supraglottic Airway (LMA)',         category: 'airway',          snomed: { code: '264957007', display: 'Insertion of laryngeal mask airway' } },
  { local: 'Surgical Airway (front-of-neck)',  category: 'airway',          snomed: { code: '49077009',  display: 'Emergency cricothyrotomy' } },
  { local: 'Tracheostomy — Percutaneous',      category: 'airway',          snomed: { code: '48387007',  display: 'Tracheotomy' } },
  { local: 'Tracheostomy — Surgical',          category: 'airway',          snomed: { code: '48387007',  display: 'Tracheotomy' } },
  { local: 'Tracheostomy Change',              category: 'airway',          snomed: { code: '182830007', display: 'Replacement of tracheostomy tube' } },
  { local: 'Bronchoscopy',                     category: 'airway',          snomed: { code: '10847001',  display: 'Bronchoscopy' } },
  // ── Vascular access ───────────────────────────────────────────────────────
  { local: 'Central Venous Catheter',          category: 'vascular_access', snomed: { code: '233547005', display: 'Insertion of central venous catheter' } },
  { local: 'Arterial Line',                    category: 'vascular_access', snomed: { code: '392247006', display: 'Insertion of arterial catheter' } },
  { local: 'PICC Line',                        category: 'vascular_access', snomed: { code: '233553001', display: 'Insertion of peripherally inserted central catheter' } },
  { local: 'Intraosseous Access',              category: 'vascular_access', snomed: { code: '392188009', display: 'Intraosseous cannulation' } },
  { local: 'Pulmonary Artery Catheter',        category: 'vascular_access', snomed: { code: '18162001',  display: 'Insertion of Swan-Ganz catheter' } },
  { local: 'Vascath / Dialysis Catheter',      category: 'vascular_access', snomed: { code: '233548000', display: 'Insertion of vascular access device' } },
  { local: 'REBOA',                            category: 'vascular_access', snomed: { code: '233548000', display: 'Resuscitative endovascular balloon occlusion of aorta' }, nci: { code: 'C158369', display: 'REBOA' } },
  // ── Respiratory ───────────────────────────────────────────────────────────
  { local: 'Pleural Aspiration',               category: 'respiratory',     snomed: { code: '54690008',  display: 'Thoracentesis' } },
  { local: 'Chest Drain Insertion',            category: 'respiratory',     snomed: { code: '264957007', display: 'Insertion of chest tube' } },
  { local: 'HFOV Setup',                       category: 'respiratory',     snomed: { code: '243142003', display: 'High frequency oscillatory ventilation' } },
  { local: 'Prone Positioning',                category: 'respiratory',     snomed: { code: '397006009', display: 'Prone positioning' } },
  // ── Cardiovascular ────────────────────────────────────────────────────────
  { local: 'Cardioversion / Defibrillation',   category: 'cardiovascular',  snomed: { code: '180325003', display: 'Direct current cardioversion' } },
  { local: 'Pericardiocentesis',               category: 'cardiovascular',  snomed: { code: '81292000',  display: 'Pericardiocentesis' } },
  { local: 'Temporary Transvenous Pacing',     category: 'cardiovascular',  snomed: { code: '233173001', display: 'Insertion of temporary transvenous pacemaker' } },
  { local: 'ECMO Cannulation',                 category: 'cardiovascular',  snomed: { code: '233545002', display: 'Extracorporeal membrane oxygenation' }, nci: { code: 'C119130', display: 'ECMO' } },
  { local: 'IABP Insertion',                   category: 'cardiovascular',  snomed: { code: '233573006', display: 'Insertion of intra-aortic balloon pump' } },
  // ── Neurological ──────────────────────────────────────────────────────────
  { local: 'Lumbar Puncture',                  category: 'neurological',    snomed: { code: '277762005', display: 'Lumbar puncture' } },
  { local: 'ICP Monitor Insertion',            category: 'neurological',    snomed: { code: '174052006', display: 'Insertion of intracranial pressure monitor' } },
  { local: 'Brain-stem Death Testing',         category: 'neurological',    snomed: { code: '406156007', display: 'Brain stem death testing' }, nci: { code: 'C94908', display: 'Brain Death Determination' } },
  // ── Renal ─────────────────────────────────────────────────────────────────
  { local: 'Urinary Catheterisation',          category: 'renal',           snomed: { code: '55027006',  display: 'Urethral catheterization' } },
  { local: 'Haemofiltration Setup (CVVH)',     category: 'renal',           snomed: { code: '233588009', display: 'Continuous venovenous haemofiltration' } },
  // ── Abdominal / GI ────────────────────────────────────────────────────────
  { local: 'Nasogastric Tube',                 category: 'abdominal',       snomed: { code: '165888003', display: 'Insertion of nasogastric tube' } },
  { local: 'Ascitic Aspiration',               category: 'abdominal',       snomed: { code: '386334000', display: 'Abdominal paracentesis' } },
  { local: 'Ascitic Drain Insertion',          category: 'abdominal',       snomed: { code: '442301003', display: 'Placement of abdominal drain' } },
  { local: 'Sengstaken-Blakemore Tube',        category: 'abdominal',       snomed: { code: '313211009', display: 'Insertion of Sengstaken tube' } },
  // ── Imaging ───────────────────────────────────────────────────────────────
  { local: 'Ultrasound-guided Procedure',      category: 'imaging',         snomed: { code: '241511001', display: 'Ultrasound-guided procedure' } },
  { local: 'Transoesophageal Echo (TOE)',      category: 'imaging',         snomed: { code: '315236000', display: 'Transesophageal echocardiography' } },
  // ── Other ─────────────────────────────────────────────────────────────────
  { local: 'Other',                            category: 'other',           snomed: null },
];

export const PROCEDURE_LABELS = PROCEDURE_DEFS.map((d) => d.local);

export const PROCEDURE_CATEGORIES = [
  'airway', 'vascular_access', 'respiratory', 'cardiovascular',
  'neurological', 'renal', 'abdominal', 'imaging', 'other',
] as const;

export function procedureToCoded(local: string): CodedValue | null {
  const def = PROCEDURE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [
        ...(def.nci ? [{ system: CODE_SYSTEMS.nci, code: def.nci.code, display: def.nci.display }] : []),
      ],
    };
  }
  return {
    system: CODE_SYSTEMS.iculogbook,
    code: `procedure/other`,
    display: def.local,
  };
}
