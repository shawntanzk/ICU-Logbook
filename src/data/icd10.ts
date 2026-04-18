import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Curated ICU-relevant ICD-10 codes.
// Not exhaustive — covers common critical-care presentations. Extend as needed.
// Source: WHO ICD-10 2019 + ICD-10-CM 2024, filtered for conditions a trainee
// would log. Optional `snomed` field carries the SNOMED CT equivalent so the
// semantic export can emit a dual coding.

export interface ICD10Entry {
  code: string;
  label: string;
  snomed?: { code: string; display: string };
}

export const ICD10_CODES: ICD10Entry[] = [
  // ── Infections / Sepsis ───────────────────────────────────────────────
  { code: 'A40.0', label: 'Sepsis due to streptococcus, group A', snomed: { code: '10001005',  display: 'Bacterial sepsis' } },
  { code: 'A40.3', label: 'Sepsis due to Streptococcus pneumoniae', snomed: { code: '186482005', display: 'Pneumococcal septicaemia' } },
  { code: 'A41.0', label: 'Sepsis due to Staphylococcus aureus', snomed: { code: '10001005', display: 'Bacterial sepsis' } },
  { code: 'A41.01', label: 'Sepsis due to MSSA' },
  { code: 'A41.02', label: 'Sepsis due to MRSA', snomed: { code: '432295005', display: 'Sepsis caused by methicillin-resistant Staphylococcus aureus' } },
  { code: 'A41.50', label: 'Gram-negative sepsis, unspecified', snomed: { code: '76571007', display: 'Septicaemia' } },
  { code: 'A41.51', label: 'Sepsis due to Escherichia coli', snomed: { code: '722943009', display: 'Sepsis caused by Escherichia coli' } },
  { code: 'A41.52', label: 'Sepsis due to Pseudomonas' },
  { code: 'A41.9', label: 'Sepsis, unspecified organism', snomed: { code: '91302008', display: 'Sepsis' } },
  { code: 'A49.9', label: 'Bacterial infection, unspecified' },
  { code: 'B37.7', label: 'Candidal sepsis', snomed: { code: '51669005', display: 'Candidal sepsis' } },
  { code: 'B95.62', label: 'MRSA infection as cause of disease' },
  { code: 'B96.5', label: 'Pseudomonas as cause of disease' },
  { code: 'R65.20', label: 'Severe sepsis without septic shock', snomed: { code: '10001005', display: 'Severe sepsis' } },
  { code: 'R65.21', label: 'Severe sepsis with septic shock', snomed: { code: '76571007', display: 'Septic shock' } },

  // ── Respiratory ───────────────────────────────────────────────────────
  { code: 'J12.82', label: 'Pneumonia due to coronavirus (COVID-19)', snomed: { code: '882784691000119100', display: 'Pneumonia caused by SARS-CoV-2' } },
  { code: 'J15.0',  label: 'Pneumonia due to Klebsiella pneumoniae', snomed: { code: '9861002', display: 'Pneumonia caused by Klebsiella pneumoniae' } },
  { code: 'J15.1',  label: 'Pneumonia due to Pseudomonas', snomed: { code: '233607000', display: 'Pseudomonas pneumonia' } },
  { code: 'J15.20', label: 'Pneumonia due to staphylococcus, unspecified' },
  { code: 'J15.212', label: 'Pneumonia due to MRSA' },
  { code: 'J15.9',  label: 'Bacterial pneumonia, unspecified', snomed: { code: '53084003', display: 'Bacterial pneumonia' } },
  { code: 'J18.9',  label: 'Pneumonia, unspecified organism', snomed: { code: '233604007', display: 'Pneumonia' } },
  { code: 'J69.0',  label: 'Aspiration pneumonia', snomed: { code: '70536003', display: 'Aspiration pneumonia' } },
  { code: 'J80',    label: 'Acute respiratory distress syndrome (ARDS)', snomed: { code: '67782005', display: 'Acute respiratory distress syndrome' } },
  { code: 'J81.0',  label: 'Acute pulmonary oedema', snomed: { code: '19242006', display: 'Acute pulmonary oedema' } },
  { code: 'J93.0',  label: 'Spontaneous tension pneumothorax', snomed: { code: '233645004', display: 'Tension pneumothorax' } },
  { code: 'J93.1',  label: 'Other spontaneous pneumothorax', snomed: { code: '36118008', display: 'Pneumothorax' } },
  { code: 'J95.851', label: 'Ventilator-associated pneumonia', snomed: { code: '429271009', display: 'Ventilator-associated pneumonia' } },
  { code: 'J96.00', label: 'Acute respiratory failure, unspecified', snomed: { code: '65710008', display: 'Acute respiratory failure' } },
  { code: 'J96.01', label: 'Acute respiratory failure with hypoxia', snomed: { code: '409622000', display: 'Acute hypoxaemic respiratory failure' } },
  { code: 'J96.02', label: 'Acute respiratory failure with hypercapnia', snomed: { code: '87433001', display: 'Hypercapnic respiratory failure' } },
  { code: 'J96.20', label: 'Acute and chronic respiratory failure, unspecified' },
  { code: 'J96.21', label: 'Acute-on-chronic respiratory failure with hypoxia' },
  { code: 'J96.22', label: 'Acute-on-chronic respiratory failure with hypercapnia' },
  { code: 'J44.1',  label: 'COPD with acute exacerbation', snomed: { code: '195951007', display: 'Acute exacerbation of chronic obstructive pulmonary disease' } },
  { code: 'J45.901', label: 'Unspecified asthma with acute exacerbation' },
  { code: 'J45.902', label: 'Unspecified asthma with status asthmaticus', snomed: { code: '57546000', display: 'Status asthmaticus' } },
  { code: 'J98.11', label: 'Atelectasis', snomed: { code: '46621007', display: 'Atelectasis' } },

  // ── Cardiovascular ────────────────────────────────────────────────────
  { code: 'I21.0',  label: 'STEMI — anterior wall', snomed: { code: '54329005', display: 'Acute myocardial infarction of anterior wall' } },
  { code: 'I21.1',  label: 'STEMI — inferior wall', snomed: { code: '73795002', display: 'Acute myocardial infarction of inferior wall' } },
  { code: 'I21.4',  label: 'NSTEMI', snomed: { code: '401314000', display: 'Non-ST elevation myocardial infarction' } },
  { code: 'I21.9',  label: 'Acute myocardial infarction, unspecified', snomed: { code: '57054005', display: 'Acute myocardial infarction' } },
  { code: 'I26.09', label: 'Pulmonary embolism with acute cor pulmonale', snomed: { code: '233935004', display: 'Acute massive pulmonary embolism' } },
  { code: 'I26.99', label: 'Pulmonary embolism without acute cor pulmonale', snomed: { code: '59282003', display: 'Pulmonary embolism' } },
  { code: 'I46.2',  label: 'Cardiac arrest due to underlying cardiac condition' },
  { code: 'I46.8',  label: 'Cardiac arrest due to other underlying condition' },
  { code: 'I46.9',  label: 'Cardiac arrest, cause unspecified', snomed: { code: '410429000', display: 'Cardiac arrest' } },
  { code: 'I47.2',  label: 'Ventricular tachycardia', snomed: { code: '25569003', display: 'Ventricular tachycardia' } },
  { code: 'I48.0',  label: 'Paroxysmal atrial fibrillation', snomed: { code: '282825002', display: 'Paroxysmal atrial fibrillation' } },
  { code: 'I48.91', label: 'Atrial fibrillation, unspecified', snomed: { code: '49436004', display: 'Atrial fibrillation' } },
  { code: 'I49.01', label: 'Ventricular fibrillation', snomed: { code: '71908006', display: 'Ventricular fibrillation' } },
  { code: 'I50.1',  label: 'Left ventricular failure, unspecified', snomed: { code: '85232009', display: 'Left heart failure' } },
  { code: 'I50.21', label: 'Acute systolic (congestive) heart failure' },
  { code: 'I50.31', label: 'Acute diastolic (congestive) heart failure' },
  { code: 'I50.9',  label: 'Heart failure, unspecified', snomed: { code: '84114007', display: 'Heart failure' } },
  { code: 'I71.01', label: 'Dissection of thoracic aorta', snomed: { code: '308546005', display: 'Dissection of thoracic aorta' } },
  { code: 'I71.3',  label: 'Abdominal aortic aneurysm, ruptured', snomed: { code: '51491008', display: 'Ruptured abdominal aortic aneurysm' } },
  { code: 'R57.0',  label: 'Cardiogenic shock', snomed: { code: '89138009', display: 'Cardiogenic shock' } },
  { code: 'R57.1',  label: 'Hypovolaemic shock', snomed: { code: '27281000', display: 'Hypovolaemic shock' } },
  { code: 'R57.8',  label: 'Other shock' },
  { code: 'R57.9',  label: 'Shock, unspecified', snomed: { code: '27942005', display: 'Shock' } },
  { code: 'T81.10XA', label: 'Postprocedural shock, unspecified, initial encounter' },

  // ── Neurological ──────────────────────────────────────────────────────
  { code: 'G04.90',  label: 'Encephalitis, unspecified', snomed: { code: '45170000', display: 'Encephalitis' } },
  { code: 'G40.301', label: 'Generalised idiopathic epilepsy — intractable, with status' },
  { code: 'G41.0',   label: 'Grand mal status epilepticus' },
  { code: 'G41.9',   label: 'Status epilepticus, unspecified', snomed: { code: '230456007', display: 'Status epilepticus' } },
  { code: 'G61.0',   label: 'Guillain-Barré syndrome', snomed: { code: '40956001', display: 'Guillain-Barré syndrome' } },
  { code: 'G70.01',  label: 'Myasthenia gravis with (acute) exacerbation', snomed: { code: '91637004', display: 'Myasthenia gravis' } },
  { code: 'G93.1',   label: 'Anoxic brain damage, not elsewhere classified', snomed: { code: '703180008', display: 'Anoxic brain injury' } },
  { code: 'G93.40',  label: 'Encephalopathy, unspecified', snomed: { code: '81308009', display: 'Encephalopathy' } },
  { code: 'G93.41',  label: 'Metabolic encephalopathy' },
  { code: 'G93.49',  label: 'Other encephalopathy' },
  { code: 'G93.6',   label: 'Cerebral oedema', snomed: { code: '2032001', display: 'Cerebral oedema' } },
  { code: 'I60.9',   label: 'Subarachnoid haemorrhage, unspecified', snomed: { code: '21454007', display: 'Subarachnoid haemorrhage' } },
  { code: 'I61.9',   label: 'Intracerebral haemorrhage, unspecified', snomed: { code: '274100004', display: 'Cerebral haemorrhage' } },
  { code: 'I62.9',   label: 'Intracranial haemorrhage (non-traumatic), unspecified' },
  { code: 'I63.9',   label: 'Cerebral infarction, unspecified', snomed: { code: '432504007', display: 'Cerebral infarction' } },
  { code: 'R40.2420', label: 'Glasgow coma scale score 3–8, unspecified time' },
  { code: 'S06.2X9A', label: 'Diffuse traumatic brain injury, unspecified', snomed: { code: '127295002', display: 'Traumatic brain injury' } },
  { code: 'S06.5X0A', label: 'Traumatic subdural haemorrhage, initial encounter', snomed: { code: '35486000', display: 'Subdural haemorrhage' } },
  { code: 'S06.6X0A', label: 'Traumatic subarachnoid haemorrhage, initial encounter' },

  // ── Renal / Metabolic ─────────────────────────────────────────────────
  { code: 'E10.10', label: 'Type 1 diabetes with ketoacidosis, without coma', snomed: { code: '420422005', display: 'Type 1 diabetes mellitus with ketoacidosis' } },
  { code: 'E10.11', label: 'Type 1 diabetes with ketoacidosis and coma' },
  { code: 'E11.00', label: 'Type 2 diabetes with hyperosmolarity, without NKHHC', snomed: { code: '422338006', display: 'Diabetes mellitus with hyperosmolar state' } },
  { code: 'E11.01', label: 'Type 2 diabetes with hyperosmolarity and coma' },
  { code: 'E87.0',  label: 'Hyperosmolality and hypernatraemia', snomed: { code: '39355002', display: 'Hypernatraemia' } },
  { code: 'E87.1',  label: 'Hypo-osmolality and hyponatraemia', snomed: { code: '89627008', display: 'Hyponatraemia' } },
  { code: 'E87.2',  label: 'Acidosis', snomed: { code: '51387008', display: 'Acidosis' } },
  { code: 'E87.5',  label: 'Hyperkalaemia', snomed: { code: '14140009', display: 'Hyperkalaemia' } },
  { code: 'E87.6',  label: 'Hypokalaemia', snomed: { code: '43339004', display: 'Hypokalaemia' } },
  { code: 'E87.70', label: 'Fluid overload, unspecified' },
  { code: 'N17.0',  label: 'Acute kidney failure with tubular necrosis', snomed: { code: '35455006', display: 'Acute tubular necrosis' } },
  { code: 'N17.9',  label: 'Acute kidney failure, unspecified', snomed: { code: '14669001', display: 'Acute kidney injury' } },
  { code: 'N18.6',  label: 'End-stage renal disease', snomed: { code: '46177005', display: 'End-stage renal disease' } },
  { code: 'N19',    label: 'Unspecified kidney failure', snomed: { code: '42399005', display: 'Renal failure' } },

  // ── GI / Hepatic ──────────────────────────────────────────────────────
  { code: 'K25.0',   label: 'Acute gastric ulcer with haemorrhage' },
  { code: 'K56.60',  label: 'Intestinal obstruction, unspecified', snomed: { code: '30242009', display: 'Intestinal obstruction' } },
  { code: 'K65.0',   label: 'Generalised (acute) peritonitis', snomed: { code: '31978002', display: 'Acute peritonitis' } },
  { code: 'K72.00',  label: 'Acute and subacute hepatic failure without coma', snomed: { code: '197270009', display: 'Acute hepatic failure' } },
  { code: 'K72.01',  label: 'Acute and subacute hepatic failure with coma' },
  { code: 'K85.90',  label: 'Acute pancreatitis, unspecified', snomed: { code: '197456007', display: 'Acute pancreatitis' } },
  { code: 'K92.2',   label: 'Gastrointestinal haemorrhage, unspecified', snomed: { code: '74474003', display: 'Gastrointestinal haemorrhage' } },

  // ── Haematological / Oncological ──────────────────────────────────────
  { code: 'D65',   label: 'Disseminated intravascular coagulation (DIC)', snomed: { code: '67406007', display: 'Disseminated intravascular coagulation' } },
  { code: 'D68.9', label: 'Coagulation defect, unspecified' },
  { code: 'D69.6', label: 'Thrombocytopenia, unspecified', snomed: { code: '302215000', display: 'Thrombocytopenia' } },
  { code: 'D70.9', label: 'Neutropenia, unspecified', snomed: { code: '165517008', display: 'Neutropenia' } },

  // ── Trauma / Poisoning ────────────────────────────────────────────────
  { code: 'S27.0XXA', label: 'Traumatic pneumothorax, initial encounter', snomed: { code: '127290008', display: 'Traumatic pneumothorax' } },
  { code: 'S27.1XXA', label: 'Traumatic haemothorax, initial encounter', snomed: { code: '65599005', display: 'Haemothorax' } },
  { code: 'T07',      label: 'Unspecified multiple injuries' },
  { code: 'T14.90',   label: 'Injury, unspecified' },
  { code: 'T40.1X1A', label: 'Poisoning by heroin, accidental, initial encounter' },
  { code: 'T40.4X1A', label: 'Poisoning by other synthetic narcotics, accidental' },
  { code: 'T42.4X2A', label: 'Poisoning by benzodiazepines, intentional self-harm' },
  { code: 'T50.901A', label: 'Poisoning by unspecified drug, accidental', snomed: { code: '75478009', display: 'Poisoning' } },
  { code: 'T71.20XA', label: 'Asphyxiation, unspecified cause, initial encounter' },
  { code: 'T79.4XXA', label: 'Traumatic shock, initial encounter' },

  // ── Obstetric / Post-surgical ─────────────────────────────────────────
  { code: 'O75.1',    label: 'Shock during or following labour and delivery' },
  { code: 'T81.12XA', label: 'Postprocedural septic shock, initial encounter' },
  { code: 'T81.4XXA', label: 'Infection following a procedure, initial encounter' },

  // ── Burns ─────────────────────────────────────────────────────────────
  { code: 'T31.30', label: 'Burns involving 30–39% of body, 0% third-degree' },
  { code: 'T31.40', label: 'Burns involving 40–49% of body, 0% third-degree' },
  { code: 'T31.50', label: 'Burns involving 50–59% of body, 0% third-degree' },

  // ── Other critical ────────────────────────────────────────────────────
  { code: 'R09.02', label: 'Hypoxaemia', snomed: { code: '389087006', display: 'Hypoxaemia' } },
  { code: 'R41.82', label: 'Altered mental status, unspecified', snomed: { code: '419284004', display: 'Altered mental status' } },
  { code: 'R56.9',  label: 'Unspecified convulsions', snomed: { code: '91175000', display: 'Seizure' } },
  { code: 'R65.10', label: 'SIRS of non-infectious origin without acute organ dysfunction', snomed: { code: '238149007', display: 'Systemic inflammatory response syndrome' } },
  { code: 'R65.11', label: 'SIRS of non-infectious origin with acute organ dysfunction' },
];

// Case-insensitive search by code or label. Returns top N matches.
export function searchICD10(query: string, limit = 20): ICD10Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const codeMatches: ICD10Entry[] = [];
  const labelMatches: ICD10Entry[] = [];
  for (const entry of ICD10_CODES) {
    if (entry.code.toLowerCase().startsWith(q)) {
      codeMatches.push(entry);
    } else if (entry.label.toLowerCase().includes(q)) {
      labelMatches.push(entry);
    }
    if (codeMatches.length + labelMatches.length >= limit * 2) break;
  }
  return [...codeMatches, ...labelMatches].slice(0, limit);
}

export function findByCode(code: string): ICD10Entry | undefined {
  const c = code.trim().toUpperCase();
  return ICD10_CODES.find((e) => e.code.toUpperCase() === c);
}

// Convert a stored ICD-10 code into one (or two) CodedValue entries suitable
// for the semantic export. If a SNOMED mapping is present, emits the ICD-10
// coding as primary and the SNOMED equivalent under `mappings[]`.
export function icd10ToCoded(code: string): CodedValue | null {
  const entry = findByCode(code);
  if (!entry) return null;
  const primary: CodedValue = {
    system: CODE_SYSTEMS.icd10,
    code: entry.code,
    display: entry.label,
  };
  if (entry.snomed) {
    primary.mappings = [
      {
        system: CODE_SYSTEMS.snomed,
        code: entry.snomed.code,
        display: entry.snomed.display,
      },
    ];
  }
  return primary;
}
