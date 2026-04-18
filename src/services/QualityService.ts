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
  // Completeness — 7 fields the user *could* have filled in:
  // date, diagnosis (free-text), icd10Code, organSystems≥1, cobatriceDomains≥1,
  // supervisionLevel, reflection
  const fields = [
    !!c.date,
    !!c.diagnosis,
    !!c.icd10Code,
    c.organSystems.length > 0,
    c.cobatriceDomains.length > 0,
    !!c.supervisionLevel,
    !!c.reflection,
  ];
  const completeness = fraction(fields.filter(Boolean).length, fields.length);

  // Coding confidence — of the coded fields, how many resolved to a real
  // public code system (not the app-local fallback).
  const codedValues: Array<{ system: string } | null> = [
    c.diagnosisCoded,
    c.supervisionLevelCoded,
    ...c.organSystemsCoded,
    ...c.cobatriceDomainsCoded,
  ];
  const resolved = codedValues.filter(Boolean) as { system: string }[];
  const public_ = resolved.filter(
    (v) => !v.system.endsWith('/iculogbook/ontology')
  ).length;
  const codingConfidence = fraction(public_, resolved.length);

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
