// Curated ICU-relevant ICD-10 codes.
// Not exhaustive — covers common critical-care presentations. Extend as needed.
// Source: WHO ICD-10 2019, filtered for conditions a trainee would log.

export interface ICD10Entry {
  code: string;
  label: string;
}

export const ICD10_CODES: ICD10Entry[] = [
  // ── Infections / Sepsis ───────────────────────────────────────────────
  { code: 'A40.0', label: 'Sepsis due to streptococcus, group A' },
  { code: 'A40.3', label: 'Sepsis due to Streptococcus pneumoniae' },
  { code: 'A41.0', label: 'Sepsis due to Staphylococcus aureus' },
  { code: 'A41.01', label: 'Sepsis due to MSSA' },
  { code: 'A41.02', label: 'Sepsis due to MRSA' },
  { code: 'A41.50', label: 'Gram-negative sepsis, unspecified' },
  { code: 'A41.51', label: 'Sepsis due to Escherichia coli' },
  { code: 'A41.52', label: 'Sepsis due to Pseudomonas' },
  { code: 'A41.9', label: 'Sepsis, unspecified organism' },
  { code: 'A49.9', label: 'Bacterial infection, unspecified' },
  { code: 'B37.7', label: 'Candidal sepsis' },
  { code: 'B95.62', label: 'MRSA infection as cause of disease' },
  { code: 'B96.5', label: 'Pseudomonas as cause of disease' },
  { code: 'R65.20', label: 'Severe sepsis without septic shock' },
  { code: 'R65.21', label: 'Severe sepsis with septic shock' },

  // ── Respiratory ───────────────────────────────────────────────────────
  { code: 'J12.82', label: 'Pneumonia due to coronavirus (COVID-19)' },
  { code: 'J15.0', label: 'Pneumonia due to Klebsiella pneumoniae' },
  { code: 'J15.1', label: 'Pneumonia due to Pseudomonas' },
  { code: 'J15.20', label: 'Pneumonia due to staphylococcus, unspecified' },
  { code: 'J15.212', label: 'Pneumonia due to MRSA' },
  { code: 'J15.9', label: 'Bacterial pneumonia, unspecified' },
  { code: 'J18.9', label: 'Pneumonia, unspecified organism' },
  { code: 'J69.0', label: 'Aspiration pneumonia' },
  { code: 'J80', label: 'Acute respiratory distress syndrome (ARDS)' },
  { code: 'J81.0', label: 'Acute pulmonary oedema' },
  { code: 'J93.0', label: 'Spontaneous tension pneumothorax' },
  { code: 'J93.1', label: 'Other spontaneous pneumothorax' },
  { code: 'J95.851', label: 'Ventilator-associated pneumonia' },
  { code: 'J96.00', label: 'Acute respiratory failure, unspecified' },
  { code: 'J96.01', label: 'Acute respiratory failure with hypoxia' },
  { code: 'J96.02', label: 'Acute respiratory failure with hypercapnia' },
  { code: 'J96.20', label: 'Acute and chronic respiratory failure, unspecified' },
  { code: 'J96.21', label: 'Acute-on-chronic respiratory failure with hypoxia' },
  { code: 'J96.22', label: 'Acute-on-chronic respiratory failure with hypercapnia' },
  { code: 'J44.1', label: 'COPD with acute exacerbation' },
  { code: 'J45.901', label: 'Unspecified asthma with acute exacerbation' },
  { code: 'J45.902', label: 'Unspecified asthma with status asthmaticus' },
  { code: 'J98.11', label: 'Atelectasis' },

  // ── Cardiovascular ────────────────────────────────────────────────────
  { code: 'I21.0', label: 'STEMI — anterior wall' },
  { code: 'I21.1', label: 'STEMI — inferior wall' },
  { code: 'I21.4', label: 'NSTEMI' },
  { code: 'I21.9', label: 'Acute myocardial infarction, unspecified' },
  { code: 'I26.09', label: 'Pulmonary embolism with acute cor pulmonale' },
  { code: 'I26.99', label: 'Pulmonary embolism without acute cor pulmonale' },
  { code: 'I46.2', label: 'Cardiac arrest due to underlying cardiac condition' },
  { code: 'I46.8', label: 'Cardiac arrest due to other underlying condition' },
  { code: 'I46.9', label: 'Cardiac arrest, cause unspecified' },
  { code: 'I47.2', label: 'Ventricular tachycardia' },
  { code: 'I48.0', label: 'Paroxysmal atrial fibrillation' },
  { code: 'I48.91', label: 'Atrial fibrillation, unspecified' },
  { code: 'I49.01', label: 'Ventricular fibrillation' },
  { code: 'I50.1', label: 'Left ventricular failure, unspecified' },
  { code: 'I50.21', label: 'Acute systolic (congestive) heart failure' },
  { code: 'I50.31', label: 'Acute diastolic (congestive) heart failure' },
  { code: 'I50.9', label: 'Heart failure, unspecified' },
  { code: 'I71.01', label: 'Dissection of thoracic aorta' },
  { code: 'I71.3', label: 'Abdominal aortic aneurysm, ruptured' },
  { code: 'R57.0', label: 'Cardiogenic shock' },
  { code: 'R57.1', label: 'Hypovolaemic shock' },
  { code: 'R57.8', label: 'Other shock' },
  { code: 'R57.9', label: 'Shock, unspecified' },
  { code: 'T81.10XA', label: 'Postprocedural shock, unspecified, initial encounter' },

  // ── Neurological ──────────────────────────────────────────────────────
  { code: 'G04.90', label: 'Encephalitis, unspecified' },
  { code: 'G40.301', label: 'Generalised idiopathic epilepsy — intractable, with status' },
  { code: 'G41.0', label: 'Grand mal status epilepticus' },
  { code: 'G41.9', label: 'Status epilepticus, unspecified' },
  { code: 'G61.0', label: 'Guillain-Barré syndrome' },
  { code: 'G70.01', label: 'Myasthenia gravis with (acute) exacerbation' },
  { code: 'G93.1', label: 'Anoxic brain damage, not elsewhere classified' },
  { code: 'G93.40', label: 'Encephalopathy, unspecified' },
  { code: 'G93.41', label: 'Metabolic encephalopathy' },
  { code: 'G93.49', label: 'Other encephalopathy' },
  { code: 'G93.6', label: 'Cerebral oedema' },
  { code: 'I60.9', label: 'Subarachnoid haemorrhage, unspecified' },
  { code: 'I61.9', label: 'Intracerebral haemorrhage, unspecified' },
  { code: 'I62.9', label: 'Intracranial haemorrhage (non-traumatic), unspecified' },
  { code: 'I63.9', label: 'Cerebral infarction, unspecified' },
  { code: 'R40.2420', label: 'Glasgow coma scale score 3–8, unspecified time' },
  { code: 'S06.2X9A', label: 'Diffuse traumatic brain injury, unspecified' },
  { code: 'S06.5X0A', label: 'Traumatic subdural haemorrhage, initial encounter' },
  { code: 'S06.6X0A', label: 'Traumatic subarachnoid haemorrhage, initial encounter' },

  // ── Renal / Metabolic ─────────────────────────────────────────────────
  { code: 'E10.10', label: 'Type 1 diabetes with ketoacidosis, without coma' },
  { code: 'E10.11', label: 'Type 1 diabetes with ketoacidosis and coma' },
  { code: 'E11.00', label: 'Type 2 diabetes with hyperosmolarity, without NKHHC' },
  { code: 'E11.01', label: 'Type 2 diabetes with hyperosmolarity and coma' },
  { code: 'E87.0', label: 'Hyperosmolality and hypernatraemia' },
  { code: 'E87.1', label: 'Hypo-osmolality and hyponatraemia' },
  { code: 'E87.2', label: 'Acidosis' },
  { code: 'E87.5', label: 'Hyperkalaemia' },
  { code: 'E87.6', label: 'Hypokalaemia' },
  { code: 'E87.70', label: 'Fluid overload, unspecified' },
  { code: 'N17.0', label: 'Acute kidney failure with tubular necrosis' },
  { code: 'N17.9', label: 'Acute kidney failure, unspecified' },
  { code: 'N18.6', label: 'End-stage renal disease' },
  { code: 'N19', label: 'Unspecified kidney failure' },

  // ── GI / Hepatic ──────────────────────────────────────────────────────
  { code: 'K25.0', label: 'Acute gastric ulcer with haemorrhage' },
  { code: 'K56.60', label: 'Intestinal obstruction, unspecified' },
  { code: 'K65.0', label: 'Generalised (acute) peritonitis' },
  { code: 'K72.00', label: 'Acute and subacute hepatic failure without coma' },
  { code: 'K72.01', label: 'Acute and subacute hepatic failure with coma' },
  { code: 'K85.90', label: 'Acute pancreatitis, unspecified' },
  { code: 'K92.2', label: 'Gastrointestinal haemorrhage, unspecified' },

  // ── Haematological / Oncological ──────────────────────────────────────
  { code: 'D65', label: 'Disseminated intravascular coagulation (DIC)' },
  { code: 'D68.9', label: 'Coagulation defect, unspecified' },
  { code: 'D69.6', label: 'Thrombocytopenia, unspecified' },
  { code: 'D70.9', label: 'Neutropenia, unspecified' },

  // ── Trauma / Poisoning ────────────────────────────────────────────────
  { code: 'S27.0XXA', label: 'Traumatic pneumothorax, initial encounter' },
  { code: 'S27.1XXA', label: 'Traumatic haemothorax, initial encounter' },
  { code: 'T07', label: 'Unspecified multiple injuries' },
  { code: 'T14.90', label: 'Injury, unspecified' },
  { code: 'T40.1X1A', label: 'Poisoning by heroin, accidental, initial encounter' },
  { code: 'T40.4X1A', label: 'Poisoning by other synthetic narcotics, accidental' },
  { code: 'T42.4X2A', label: 'Poisoning by benzodiazepines, intentional self-harm' },
  { code: 'T50.901A', label: 'Poisoning by unspecified drug, accidental' },
  { code: 'T71.20XA', label: 'Asphyxiation, unspecified cause, initial encounter' },
  { code: 'T79.4XXA', label: 'Traumatic shock, initial encounter' },

  // ── Obstetric / Post-surgical ─────────────────────────────────────────
  { code: 'O75.1', label: 'Shock during or following labour and delivery' },
  { code: 'T81.12XA', label: 'Postprocedural septic shock, initial encounter' },
  { code: 'T81.4XXA', label: 'Infection following a procedure, initial encounter' },

  // ── Burns ─────────────────────────────────────────────────────────────
  { code: 'T31.30', label: 'Burns involving 30–39% of body, 0% third-degree' },
  { code: 'T31.40', label: 'Burns involving 40–49% of body, 0% third-degree' },
  { code: 'T31.50', label: 'Burns involving 50–59% of body, 0% third-degree' },

  // ── Other critical ────────────────────────────────────────────────────
  { code: 'R09.02', label: 'Hypoxaemia' },
  { code: 'R41.82', label: 'Altered mental status, unspecified' },
  { code: 'R56.9', label: 'Unspecified convulsions' },
  { code: 'R65.10', label: 'SIRS of non-infectious origin without acute organ dysfunction' },
  { code: 'R65.11', label: 'SIRS of non-infectious origin with acute organ dysfunction' },
];

// Case-insensitive search by code or label. Returns top N matches.
export function searchICD10(query: string, limit = 20): ICD10Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Prefer code-prefix matches, then label-substring matches.
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
