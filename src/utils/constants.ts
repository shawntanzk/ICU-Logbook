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

// ─── Supervision levels ───────────────────────────────────────────────────────

export interface SupervisionOption {
  id: string;
  label: string;
  description: string;
}

export const SUPERVISION_LEVELS: SupervisionOption[] = [
  { id: 'observed', label: 'Observed', description: 'Consultant present throughout' },
  { id: 'supervised', label: 'Supervised', description: 'Consultant immediately available' },
  { id: 'unsupervised', label: 'Unsupervised', description: 'Retrospective review only' },
];

// ─── Procedure types ──────────────────────────────────────────────────────────

export const PROCEDURE_TYPES: string[] = [
  'Central Venous Catheter',
  'Arterial Line',
  'Endotracheal Intubation',
  'Bronchoscopy',
  'Pleural Aspiration',
  'Chest Drain Insertion',
  'Lumbar Puncture',
  'Paracentesis',
  'Nasogastric Tube',
  'Urinary Catheterisation',
  'Tracheostomy',
  'Cardioversion / Defibrillation',
  'Intraosseous Access',
  'Pulmonary Artery Catheter',
  'PICC Line',
  'Ultrasound-guided Procedure',
  'Other',
];
