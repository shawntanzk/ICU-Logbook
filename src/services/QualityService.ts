import { CaseLog } from '../models/CaseLog';
import { ProcedureLog } from '../models/ProcedureLog';
import { Quality } from '../models/Provenance';

// Per-record quality scoring. Both scores are in [0, 1] and surface in the
// export so buyers can filter on "only records above 0.7 completeness".
//
// - completeness: how many optional-but-valuable fields are populated
// - codingConfidence: fraction of categorical fields bound to a public
//   terminology (SNOMED / ICD-10 / CoBaTrICE / Ottawa EPA) rather than
//   falling back to the app-local ontology.

function fraction(populated: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((populated / total) * 100) / 100;
}

export function scoreCase(c: CaseLog): Quality {
  // Completeness — 13 scored fields (weight 1 each).
  //
  // Core fields (7) — present since v1:
  //   date, diagnosis, icd10Code, organSystems≥1, cobatriceDomains≥1,
  //   supervisionLevel, reflection
  //
  // ARCP parity fields (6) — added in v9:
  //   patientAge, patientSex, primarySpecialty, levelOfCare,
  //   involvement, outcome
  //
  // Booleans (admitted, cardiacArrest, etc.) are always set so don't add
  // to the denominator — they can't be "missing".
  const fields: boolean[] = [
    // ── core ────────────────────────────────────────────────────────────
    !!c.date,
    !!c.diagnosis,
    !!(c.icd10Code && c.icd10Code.length > 0),
    c.organSystems.length > 0,
    c.cobatriceDomains.length > 0,
    !!c.supervisionLevel,
    !!(c.reflection && c.reflection.trim().length > 0),
    // ── ARCP parity ──────────────────────────────────────────────────────
    !!(c.patientAge && c.patientAge.length > 0),
    !!c.patientSex,
    !!c.primarySpecialty,
    !!c.levelOfCare,
    !!c.involvement,
    !!c.outcome,
  ];
  const completeness = fraction(fields.filter(Boolean).length, fields.length);

  // Coding confidence — of the coded fields, how many resolved to a real
  // public code system (not the app-local fallback).
  const codedValues: Array<{ system: string } | null | undefined> = [
    c.diagnosisCoded,
    c.supervisionLevelCoded,
    c.specialtyCoded ?? null,
    c.levelOfCareCoded ?? null,
    c.outcomeCoded ?? null,
    ...c.organSystemsCoded,
    ...c.cobatriceDomainsCoded,
  ];
  const resolved = codedValues.filter(Boolean) as { system: string }[];
  const public_ = resolved.filter(
    (v) => !v.system.endsWith('/iculogbook/ontology')
  ).length;
  const codingConfidence = fraction(public_, Math.max(resolved.length, 1));

  return { completeness, codingConfidence };
}

export function scoreProcedure(p: ProcedureLog): Quality {
  const fields = [
    !!p.procedureType,
    p.attempts > 0,
    p.success !== undefined,
    !!p.complications,
    !!p.caseId,
  ];
  const completeness = fraction(fields.filter(Boolean).length, fields.length);

  const codingConfidence = p.procedureTypeCoded?.system &&
    !p.procedureTypeCoded.system.endsWith('/iculogbook/ontology')
    ? 1
    : 0;

  return { completeness, codingConfidence };
}
