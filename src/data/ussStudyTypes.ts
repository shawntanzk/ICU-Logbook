import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Point-of-care ultrasound (POCUS) study type catalogue.
// Matches the USS columns in the Mark Tan NW Deanery spreadsheet.
// OBI codes (Ontology for Biomedical Investigations) provide FAIR bindings.

export interface USSStudyTypeDef {
  local: string;
  abbreviation: string;
  fullName: string;
  snomed: { code: string; display: string } | null;
  obi?: { code: string; display: string };
  /** Category for grouping in the dashboard. */
  category: 'cardiac' | 'pulmonary' | 'vascular' | 'abdominal' | 'neurological' | 'procedural' | 'other';
}

export const USS_STUDY_TYPE_DEFS: USSStudyTypeDef[] = [
  // ── Cardiac ────────────────────────────────────────────────────────────────
  {
    local: 'FICE',
    abbreviation: 'FICE',
    fullName: 'Focused Intensive Care Echocardiography',
    snomed: { code: '45036003', display: 'Echocardiography' },
    obi: { code: 'OBI_0002341', display: 'echocardiography assay' },
    category: 'cardiac',
  },
  {
    local: 'TOE',
    abbreviation: 'TOE',
    fullName: 'Transoesophageal Echocardiography',
    snomed: { code: '315236000', display: 'Transesophageal echocardiography' },
    obi: { code: 'OBI_0002341', display: 'echocardiography assay' },
    category: 'cardiac',
  },
  // ── Pulmonary / pleural ────────────────────────────────────────────────────
  {
    local: 'Pleural',
    abbreviation: 'Pleural',
    fullName: 'Pleural Ultrasound',
    snomed: { code: '241517002', display: 'Ultrasound of pleura' },
    category: 'pulmonary',
  },
  {
    local: 'Diaphragm',
    abbreviation: 'Diaph',
    fullName: 'Diaphragm Ultrasound',
    snomed: { code: '241511001', display: 'Ultrasound scan' },
    category: 'pulmonary',
  },
  // ── Vascular ───────────────────────────────────────────────────────────────
  {
    local: 'DVT',
    abbreviation: 'DVT',
    fullName: 'Deep Vein Thrombosis Scan',
    snomed: { code: '241539007', display: 'Ultrasound scan of peripheral veins' },
    category: 'vascular',
  },
  {
    local: 'VEXUS',
    abbreviation: 'VEXUS',
    fullName: 'Venous Excess Ultrasound Score',
    snomed: null,
    category: 'vascular',
  },
  {
    local: 'TCD',
    abbreviation: 'TCD',
    fullName: 'Transcranial Doppler',
    snomed: { code: '241500003', display: 'Transcranial Doppler ultrasonography' },
    category: 'neurological',
  },
  {
    local: 'Duplex',
    abbreviation: 'Duplex',
    fullName: 'Duplex / Vascular Doppler',
    snomed: { code: '241539007', display: 'Duplex ultrasound scan of peripheral vessels' },
    category: 'vascular',
  },
  // ── Abdominal ─────────────────────────────────────────────────────────────
  {
    local: 'FAST',
    abbreviation: 'FAST',
    fullName: 'Focused Assessment with Sonography in Trauma',
    snomed: { code: '241597007', display: 'Focused abdominal sonography for trauma' },
    category: 'abdominal',
  },
  {
    local: 'AAA',
    abbreviation: 'AAA',
    fullName: 'Abdominal Aortic Aneurysm Scan',
    snomed: { code: '241518007', display: 'Ultrasound scan of aorta' },
    category: 'abdominal',
  },
  {
    local: 'Abdominal',
    abbreviation: 'Abdo',
    fullName: 'General Abdominal Ultrasound',
    snomed: { code: '45036003', display: 'Ultrasonography of abdomen' },
    category: 'abdominal',
  },
  {
    local: 'Renal',
    abbreviation: 'Renal',
    fullName: 'Renal Ultrasound',
    snomed: { code: '241527005', display: 'Ultrasound scan of kidney' },
    category: 'abdominal',
  },
  {
    local: 'HepBil',
    abbreviation: 'HepBil',
    fullName: 'Hepatobiliary Ultrasound',
    snomed: { code: '241519004', display: 'Ultrasound scan of liver' },
    category: 'abdominal',
  },
  {
    local: 'Bladder',
    abbreviation: 'Bladder',
    fullName: 'Bladder Scan',
    snomed: { code: '241534003', display: 'Ultrasound scan of bladder' },
    category: 'abdominal',
  },
  // ── Other ─────────────────────────────────────────────────────────────────
  {
    local: 'Ocular',
    abbreviation: 'Ocular',
    fullName: 'Ocular / ONSD Ultrasound',
    snomed: { code: '241534003', display: 'Ultrasound scan of eye' },
    category: 'neurological',
  },
];

export const USS_STUDY_TYPE_LABELS = USS_STUDY_TYPE_DEFS.map((d) => d.local);

export function ussStudyTypeToCoded(local: string): CodedValue | null {
  const def = USS_STUDY_TYPE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [
        { system: CODE_SYSTEMS.icmUss, code: local, display: def.fullName },
        ...(def.obi ? [{ system: CODE_SYSTEMS.obi, code: def.obi.code, display: def.obi.display }] : []),
      ],
    };
  }
  return {
    system: CODE_SYSTEMS.icmUss,
    code: local,
    display: def.fullName,
  };
}
