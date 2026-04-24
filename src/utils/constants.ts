// ─── Design tokens ───────────────────────────────────────────────────────────

export const COLORS = {
  primary: '#0F4C81',
  primaryLight: '#1976D2',
  accent: '#00B2A9',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.06)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

// ─── CoBaTrICE competency domains ────────────────────────────────────────────

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
}

export const COBATRICE_DOMAINS: SelectOption[] = [
  { id: 'd1', label: 'Resuscitation & Acute Stabilisation' },
  { id: 'd2', label: 'Diagnosis' },
  { id: 'd3', label: 'Disease Management' },
  { id: 'd4', label: 'Perioperative Care' },
  { id: 'd5', label: 'Comfort & Recovery' },
  { id: 'd6', label: 'End of Life Care' },
  { id: 'd7', label: 'Paediatric Intensive Care' },
  { id: 'd8', label: 'Transport' },
  { id: 'd9', label: 'Organ Donation' },
  { id: 'd10', label: 'Patient Safety & Quality' },
  { id: 'd11', label: 'Professionalism' },
  { id: 'd12', label: 'Regional Intensive Care' },
];

// ─── Organ systems ────────────────────────────────────────────────────────────

export const ORGAN_SYSTEMS: SelectOption[] = [
  { id: 'resp', label: 'Respiratory' },
  { id: 'cvs', label: 'Cardiovascular' },
  { id: 'neuro', label: 'Neurological' },
  { id: 'renal', label: 'Renal' },
  { id: 'hepatic', label: 'Hepatic' },
  { id: 'gi', label: 'Gastrointestinal' },
  { id: 'haem', label: 'Haematological' },
  { id: 'endo', label: 'Endocrine/Metabolic' },
  { id: 'infect', label: 'Infectious' },
  { id: 'msk', label: 'Musculoskeletal' },
  { id: 'trauma', label: 'Trauma' },
  { id: 'tox', label: 'Toxicology' },
  { id: 'other', label: 'Other' },
];

// ─── Supervision levels (5-level ICM scale) ───────────────────────────────────

export interface SupervisionOption {
  id: string;
  label: string;
  description: string;
}

export const SUPERVISION_LEVELS: SupervisionOption[] = [
  {
    id: 'immediate',
    label: 'Immediate',
    description: 'Supervisor directly present & participating',
  },
  {
    id: 'local',
    label: 'Local',
    description: 'Supervisor immediately available — same area',
  },
  {
    id: 'distant',
    label: 'Distant',
    description: 'Supervisor contactable & can attend within minutes',
  },
  {
    id: 'leading',
    label: 'Leading',
    description: 'Trainee leads independently; supervisor informed retrospectively',
  },
  {
    id: 'supervising',
    label: 'Supervising',
    description: 'Trainee acts as the supervising consultant',
  },
];

// ─── Procedure types (full catalogue) ────────────────────────────────────────

export const PROCEDURE_TYPES: string[] = [
  // Airway
  'Endotracheal Intubation',
  'Rapid Sequence Intubation (RSI)',
  'Awake Fibreoptic Intubation',
  'Supraglottic Airway (LMA)',
  'Surgical Airway (front-of-neck)',
  'Tracheostomy — Percutaneous',
  'Tracheostomy — Surgical',
  'Tracheostomy Change',
  'Bronchoscopy',
  // Vascular access
  'Central Venous Catheter',
  'Arterial Line',
  'PICC Line',
  'Intraosseous Access',
  'Pulmonary Artery Catheter',
  'Vascath / Dialysis Catheter',
  'REBOA',
  // Respiratory
  'Pleural Aspiration',
  'Chest Drain Insertion',
  'HFOV Setup',
  'Prone Positioning',
  // Cardiovascular
  'Cardioversion / Defibrillation',
  'Pericardiocentesis',
  'Temporary Transvenous Pacing',
  'ECMO Cannulation',
  'IABP Insertion',
  // Neurological
  'Lumbar Puncture',
  'ICP Monitor Insertion',
  'Brain-stem Death Testing',
  // Renal
  'Urinary Catheterisation',
  'Haemofiltration Setup (CVVH)',
  // Abdominal / GI
  'Nasogastric Tube',
  'Ascitic Aspiration',
  'Ascitic Drain Insertion',
  'Sengstaken-Blakemore Tube',
  // Imaging
  'Ultrasound-guided Procedure',
  'Transoesophageal Echo (TOE)',
  'Other',
];

// ─── Patient sex ──────────────────────────────────────────────────────────────

export const SEX_OPTIONS: SelectOption[] = [
  { id: 'M', label: 'Male' },
  { id: 'F', label: 'Female' },
  { id: 'Other', label: 'Other / Non-binary' },
  { id: 'Unknown', label: 'Unknown' },
];

// ─── Level of care ────────────────────────────────────────────────────────────

export const LEVEL_OF_CARE_OPTIONS: SelectOption[] = [
  { id: '1', label: 'Level 1 — Enhanced ward monitoring' },
  { id: '2', label: 'Level 2 — HDU / single-organ support' },
  { id: '3', label: 'Level 3 — ICU / multi-organ support' },
];

// ─── Involvement ─────────────────────────────────────────────────────────────

export const INVOLVEMENT_OPTIONS: SelectOption[] = [
  { id: 'major', label: 'Major', description: 'Primary clinical decision-maker' },
  { id: 'minor', label: 'Minor', description: 'Contributing or assisting' },
  { id: 'procedure_only', label: 'Procedure only', description: 'Performed a procedure; not managing overall care' },
];

// ─── Patient outcome ──────────────────────────────────────────────────────────

export const OUTCOME_OPTIONS: SelectOption[] = [
  { id: 'survived_icu', label: 'Survived — Discharged from ICU' },
  { id: 'survived_ward', label: 'Survived — Discharged from ward' },
  { id: 'died', label: 'Died' },
  { id: 'withdrawn', label: 'Care withdrawn / Comfort measures' },
  { id: 'transferred_out', label: 'Transferred out' },
  { id: 'still_inpatient', label: 'Still inpatient' },
  { id: 'unknown', label: 'Unknown' },
];

// ─── Teaching recipient ───────────────────────────────────────────────────────

export const TEACHING_RECIPIENT_OPTIONS: SelectOption[] = [
  { id: 'medical_student', label: 'Medical student' },
  { id: 'fy', label: 'FY doctor' },
  { id: 'ct_st', label: 'CT/ST trainee' },
  { id: 'nurse', label: 'Nurse' },
  { id: 'allied_health', label: 'Allied health professional' },
  { id: 'other', label: 'Other' },
];

// ─── Specialties ──────────────────────────────────────────────────────────────

export const SPECIALTY_OPTIONS: SelectOption[] = [
  { id: 'ICU / General ICM', label: 'ICU / General ICM' },
  { id: 'Cardiothoracic ICU', label: 'Cardiothoracic ICU' },
  { id: 'Neuro ICU', label: 'Neuro ICU' },
  { id: 'Paediatric ICU', label: 'Paediatric ICU' },
  { id: 'Anaesthetics', label: 'Anaesthetics' },
  { id: 'Emergency Medicine', label: 'Emergency Medicine' },
  { id: 'Acute Medicine', label: 'Acute Medicine' },
  { id: 'Cardiology', label: 'Cardiology' },
  { id: 'Respiratory Medicine', label: 'Respiratory Medicine' },
  { id: 'Gastroenterology', label: 'Gastroenterology' },
  { id: 'Nephrology', label: 'Nephrology' },
  { id: 'Neurology', label: 'Neurology' },
  { id: 'Haematology', label: 'Haematology' },
  { id: 'Oncology', label: 'Oncology' },
  { id: 'Infectious Diseases', label: 'Infectious Diseases' },
  { id: 'General Surgery', label: 'General Surgery' },
  { id: 'Cardiothoracic Surgery', label: 'Cardiothoracic Surgery' },
  { id: 'Vascular Surgery', label: 'Vascular Surgery' },
  { id: 'Neurosurgery', label: 'Neurosurgery' },
  { id: 'Trauma Surgery', label: 'Trauma Surgery' },
  { id: 'Urology', label: 'Urology' },
  { id: 'Obstetrics', label: 'Obstetrics' },
  { id: 'Burns', label: 'Burns' },
  { id: 'Other', label: 'Other' },
];
