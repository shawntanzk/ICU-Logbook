import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Primary specialty pick-list matching the NW Deanery ICM logbook.
// SNOMED codes reference the "specialty" hierarchy under Clinical finding.
// NCI codes provide an alternative binding from the NCI Thesaurus.

export interface SpecialtyDef {
  local: string;
  snomed: { code: string; display: string } | null;
  nci?: { code: string; display: string };
}

export const SPECIALTY_DEFS: SpecialtyDef[] = [
  {
    local: 'ICU / General ICM',
    snomed: { code: '408478003', display: 'Critical care medicine' },
    nci:   { code: 'C17173', display: 'Critical Care' },
  },
  {
    local: 'Cardiothoracic ICU',
    snomed: { code: '310200003', display: 'Cardiothoracic intensive care' },
  },
  {
    local: 'Neuro ICU',
    snomed: { code: '394592004', display: 'Clinical oncology' }, // placeholder — no dedicated SNOMED
    nci:   { code: 'C17837', display: 'Neurological Intensive Care' },
  },
  {
    local: 'Paediatric ICU',
    snomed: { code: '408471009', display: 'Paediatric intensive care medicine' },
    nci:   { code: 'C94342', display: 'Pediatric Intensive Care' },
  },
  {
    local: 'Anaesthetics',
    snomed: { code: '394577000', display: 'Anaesthetics' },
    nci:   { code: 'C17164', display: 'Anesthesiology' },
  },
  {
    local: 'Emergency Medicine',
    snomed: { code: '773568002', display: 'Emergency medicine' },
    nci:   { code: 'C17171', display: 'Emergency Medicine' },
  },
  {
    local: 'Acute Medicine',
    snomed: { code: '419192003', display: 'Internal medicine' },
    nci:   { code: 'C17649', display: 'Internal Medicine' },
  },
  {
    local: 'Cardiology',
    snomed: { code: '394579002', display: 'Cardiology' },
    nci:   { code: 'C17173', display: 'Cardiology' },
  },
  {
    local: 'Respiratory Medicine',
    snomed: { code: '394580004', display: 'Clinical pharmacology' }, // fallback
    nci:   { code: 'C17827', display: 'Pulmonology' },
  },
  {
    local: 'Gastroenterology',
    snomed: { code: '394584008', display: 'Gastroenterology' },
  },
  {
    local: 'Nephrology',
    snomed: { code: '394589003', display: 'Nephrology' },
  },
  {
    local: 'Neurology',
    snomed: { code: '394591006', display: 'Neurology' },
  },
  {
    local: 'Haematology',
    snomed: { code: '394803006', display: 'Clinical haematology' },
  },
  {
    local: 'Oncology',
    snomed: { code: '394592004', display: 'Clinical oncology' },
  },
  {
    local: 'Infectious Diseases',
    snomed: { code: '394807007', display: 'Infectious diseases' },
  },
  {
    local: 'General Surgery',
    snomed: { code: '394609007', display: 'General surgery' },
  },
  {
    local: 'Cardiothoracic Surgery',
    snomed: { code: '408466002', display: 'Cardiothoracic surgery' },
  },
  {
    local: 'Vascular Surgery',
    snomed: { code: '408449004', display: 'Vascular surgery' },
  },
  {
    local: 'Neurosurgery',
    snomed: { code: '394610002', display: 'Neurosurgery' },
  },
  {
    local: 'Trauma Surgery',
    snomed: { code: '773568002', display: 'Trauma surgery' },
    nci:   { code: 'C17228', display: 'Traumatology' },
  },
  {
    local: 'Urology',
    snomed: { code: '394612005', display: 'Urology' },
  },
  {
    local: 'Obstetrics',
    snomed: { code: '394586005', display: 'Obstetrics' },
  },
  {
    local: 'Burns',
    snomed: null,
    nci:   { code: 'C17204', display: 'Burns Medicine' },
  },
  {
    local: 'Other',
    snomed: null,
  },
];

export const SPECIALTY_LABELS = SPECIALTY_DEFS.map((d) => d.local);

export function specialtyToCoded(local: string): CodedValue | null {
  const def = SPECIALTY_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [
        { system: CODE_SYSTEMS.icmSpecialty, code: local.replace(/\s+/g, '_'), display: local },
        ...(def.nci ? [{ system: CODE_SYSTEMS.nci, code: def.nci.code, display: def.nci.display }] : []),
      ],
    };
  }
  return {
    system: CODE_SYSTEMS.icmSpecialty,
    code: local.replace(/\s+/g, '_'),
    display: local,
    mappings: def.nci ? [{ system: CODE_SYSTEMS.nci, code: def.nci.code, display: def.nci.display }] : [],
  };
}
