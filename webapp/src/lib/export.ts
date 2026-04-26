import type { CaseLog, ProcedureLog, AirwayLog, ArterialLineLog, CVCLog, USSLog, RegionalBlockLog, WardReviewLog, TransferLog, EDAttendanceLog, MedicinePlacementLog } from '@/types/database'
import { formatDate } from './utils'

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = Array.isArray(val) ? val.join('; ') : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCsv).join(',')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCasesToCsv(cases: CaseLog[]) {
  const headers = ['Date', 'Diagnosis', 'ICD10', 'Supervision', 'Approved', 'Organ Systems', 'COBATRICE Domains', 'Reflection', 'Patient Age', 'Patient Sex', 'Case Number', 'Primary Specialty', 'Level of Care', 'Admitted', 'Cardiac Arrest', 'Outcome']
  const rows = cases.map(c => rowToCsv([
    formatDate(c.date),
    c.diagnosis,
    c.icd10_code,
    c.supervision_level,
    c.approved_at ? 'Yes' : 'No',
    c.organ_systems,
    c.cobatrice_domains,
    c.reflection,
    c.patient_age,
    c.patient_sex,
    c.case_number,
    c.primary_specialty,
    c.level_of_care,
    c.admitted,
    c.cardiac_arrest,
    c.outcome,
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-cases.csv')
}

export function exportProceduresToCsv(procedures: ProcedureLog[]) {
  const headers = ['Date', 'Type', 'Attempts', 'Success', 'Complications', 'Supervision', 'Approved']
  const rows = procedures.map(p => rowToCsv([
    formatDate(p.created_at),
    p.procedure_type,
    p.attempts,
    p.success,
    p.complications,
    'N/A',
    p.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-procedures.csv')
}

export function exportAirwayToCsv(logs: AirwayLog[]) {
  const headers = ['Date', 'Device', 'RSI', 'Attempts', 'Success', 'CL Grade', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.device,
    l.is_rsi,
    l.attempts,
    l.success,
    l.cormack_lehane_grade,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-airway.csv')
}

export function exportArterialLineToCsv(logs: ArterialLineLog[]) {
  const headers = ['Date', 'Site', 'USS Guided', 'Attempts', 'Success', 'Complications', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.site,
    l.uss_guided,
    l.attempts,
    l.success,
    l.complications,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-arterial-lines.csv')
}

export function exportCvcToCsv(logs: CVCLog[]) {
  const headers = ['Date', 'Site', 'USS Guided', 'Attempts', 'Success', 'Complications', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.site,
    l.uss_guided,
    l.attempts,
    l.success,
    l.complications,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-cvc.csv')
}

export function exportUssToCSV(logs: USSLog[]) {
  const headers = ['Date', 'Study Type', 'Performed', 'Formal Report', 'Findings', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.study_type,
    l.performed,
    l.formal_report,
    l.findings,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-uss.csv')
}

export function exportRegionalBlockToCsv(logs: RegionalBlockLog[]) {
  const headers = ['Date', 'Block Type', 'USS Guided', 'Catheter', 'Attempts', 'Success', 'Complications', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.block_type === 'Other' ? l.block_type_other : l.block_type,
    l.uss_guided,
    l.catheter,
    l.attempts,
    l.success,
    l.complications,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-regional-blocks.csv')
}

export function exportWardReviewsToCsv(logs: WardReviewLog[]) {
  const headers = ['Date', 'Diagnosis', 'ICD10', 'Referring Specialty', 'Outcome', 'COBATRICE Domains', 'Reflection', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.diagnosis,
    l.icd10_code,
    l.referring_specialty,
    l.review_outcome,
    l.cobatrice_domains,
    l.reflection,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-ward-reviews.csv')
}

export function exportTransfersToCsv(logs: TransferLog[]) {
  const headers = ['Date', 'Diagnosis', 'Transfer Type', 'Transfer Mode', 'From', 'To', 'Level of Care', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.diagnosis,
    l.transfer_type,
    l.transfer_mode,
    l.from_location,
    l.to_location,
    l.level_of_care,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-transfers.csv')
}

export function exportEdToCsv(logs: EDAttendanceLog[]) {
  const headers = ['Date', 'Diagnosis', 'Presenting Category', 'ICU Admission', 'Cardiac Arrest', 'COBATRICE Domains', 'Reflection', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.date),
    l.diagnosis,
    l.presenting_category,
    l.icu_admission,
    l.cardiac_arrest,
    l.cobatrice_domains,
    l.reflection,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-ed-attendances.csv')
}

export function exportMedicineToCsv(logs: MedicinePlacementLog[]) {
  const headers = ['Start Date', 'End Date', 'Specialty', 'Hospital', 'Ward', 'Patient Count', 'COBATRICE Domains', 'Reflection', 'Supervision', 'Approved']
  const rows = logs.map(l => rowToCsv([
    formatDate(l.start_date),
    formatDate(l.end_date),
    l.specialty,
    l.hospital,
    l.ward,
    l.patient_count,
    l.cobatrice_domains,
    l.reflection,
    l.supervision_level,
    l.approved_at ? 'Yes' : 'No',
  ]))
  downloadCsv([headers.join(','), ...rows].join('\n'), 'icu-medicine-placements.csv')
}
