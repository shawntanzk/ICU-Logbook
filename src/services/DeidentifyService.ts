import { CaseLog } from '../models/CaseLog';
import { ProcedureLog } from '../models/ProcedureLog';

// De-identification for export. The app deliberately does NOT capture PII
// (no names, no MRN, no free-text identifiers encouraged in the UI), so
// de-identification is essentially belt-and-braces scrubbing of the
// reflection / complications free-text fields + date-shifting for
// jurisdictions that treat specific dates as quasi-identifiers.

// Very conservative PII-looking patterns. Not meant to be a full NER
// model — just a safety net that redacts obvious mistakes.
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                       // US SSN
  /\b\d{9,10}\b/g,                                // NHI / MRN-like long numbers
  /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g,                // "Firstname Lastname"
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,       // explicit DOB-like dates
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,                // email
  /\b(?:\+?\d{1,3})?[ -]?\d{3,4}[ -]?\d{3,4}[ -]?\d{3,4}\b/g, // phone
];

function scrubText(s: string | undefined | null): string {
  if (!s) return '';
  let out = s;
  for (const re of PII_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

// Shift ISO date to the Monday of its week — coarse enough to defeat linkage
// attacks but preserves temporal trends for analytics.
function dateToEpochWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export interface DeidentifyOptions {
  shiftDates?: boolean;     // default true
  scrubFreeText?: boolean;  // default true
  stripDeviceId?: boolean;  // default true for commercial export
}

export function deidentifyCase(
  c: CaseLog,
  opts: DeidentifyOptions = {}
): CaseLog {
  const { shiftDates = true, scrubFreeText = true, stripDeviceId = true } = opts;
  return {
    ...c,
    date: shiftDates ? dateToEpochWeek(c.date) : c.date,
    reflection: scrubFreeText ? scrubText(c.reflection ?? '') : c.reflection,
    // Keep free-text diagnosis but scrub — the coded form is the primary
    // representation anyway.
    diagnosis: scrubFreeText ? scrubText(c.diagnosis) : c.diagnosis,
    provenance: stripDeviceId
      ? { ...c.provenance, deviceId: 'redacted' }
      : c.provenance,
  };
}

export function deidentifyProcedure(
  p: ProcedureLog,
  opts: DeidentifyOptions = {}
): ProcedureLog {
  const { scrubFreeText = true, stripDeviceId = true } = opts;
  return {
    ...p,
    complications: scrubFreeText ? scrubText(p.complications ?? '') : p.complications,
    provenance: stripDeviceId
      ? { ...p.provenance, deviceId: 'redacted' }
      : p.provenance,
  };
}
