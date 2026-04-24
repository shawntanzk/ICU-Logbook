// ARCPExporter — produces a multi-section CSV suitable for ARCP portfolio
// submission and compatible with Excel / Numbers / Google Sheets import.
//
// Structure:
//   One section per log type, separated by a blank row.
//   Each section starts with a header row in the form:
//     [ICU / HDU Cases],,,…
//   followed by column-name row then data rows.
//
// Cell encoding follows RFC 4180: commas, quotes and newlines are
// wrapped in double-quotes; embedded double-quotes are doubled.

import { CaseLog } from '../../models/CaseLog';
import { WardReviewLog } from '../../models/WardReviewLog';
import { TransferLog } from '../../models/TransferLog';
import { EDAttendanceLog } from '../../models/EDAttendanceLog';
import { MedicinePlacementLog } from '../../models/MedicinePlacementLog';
import { AirwayLog } from '../../models/AirwayLog';
import { ArterialLineLog } from '../../models/ArterialLineLog';
import { CVCLog } from '../../models/CVCLog';
import { USSLog } from '../../models/USSLog';
import { RegionalBlockLog } from '../../models/RegionalBlockLog';

// ── Primitive helpers ─────────────────────────────────────────────────────────

function esc(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  // Wrap in quotes if the value contains a comma, double-quote, or newline.
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function row(...cells: unknown[]): string {
  return cells.map(esc).join(',');
}

function bool(v: boolean | undefined | null): string {
  if (v == null) return '';
  return v ? 'Yes' : 'No';
}

function arr(v: string[] | undefined | null): string {
  if (!v || v.length === 0) return '';
  return v.join('; ');
}

function sectionHeader(title: string, count: number): string {
  return `[${title}] (${count} records)`;
}

// ── Section builders ──────────────────────────────────────────────────────────

function casesSection(records: CaseLog[]): string {
  const cols = [
    'Date', 'Age', 'Sex', 'Case No.', 'Specialty', 'Level of Care',
    'Involvement', 'Admitted to ICU/HDU', 'Cardiac Arrest', 'Reviewed Again',
    'Diagnosis', 'ICD-10', 'Organ Systems', 'CoBaTrICE Domains',
    'Outcome', 'Communication with Relatives',
    'Teaching Delivered', 'Teaching Recipient',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Reflection',
  ];
  const dataRows = records.map((c) =>
    row(
      c.date,
      c.patientAge ?? '',
      c.patientSex ?? '',
      c.caseNumber ?? '',
      c.primarySpecialty ?? '',
      c.levelOfCare ? `Level ${c.levelOfCare}` : '',
      c.involvement ?? '',
      bool(c.admitted),
      bool(c.cardiacArrest),
      bool(c.reviewedAgain),
      c.diagnosis,
      c.icd10Code ?? '',
      arr(c.organSystems),
      arr(c.cobatriceDomains),
      c.outcome ?? '',
      bool(c.communicatedWithRelatives),
      bool(c.teachingDelivered),
      c.teachingRecipient ?? '',
      c.supervisionLevel,
      c.supervisorUserId ?? '',
      c.externalSupervisorName ?? '',
      c.reflection ?? '',
    )
  );
  return [sectionHeader('ICU / HDU Cases', records.length), row(...cols), ...dataRows].join('\n');
}

function wardReviewsSection(records: WardReviewLog[]): string {
  const cols = [
    'Date', 'Age', 'Sex', 'Referring Specialty',
    'Diagnosis', 'ICD-10', 'Review Outcome',
    'Communication with Relatives', 'CoBaTrICE Domains',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Reflection',
  ];
  const OUTCOME_LABEL: Record<string, string> = {
    escalated_icu: 'Escalated to ICU',
    escalated_hdu: 'Escalated to HDU',
    not_escalated: 'Not escalated',
    advice_only: 'Advice only',
    other: 'Other',
  };
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.patientAge ?? '',
      r.patientSex ?? '',
      r.referringSpecialty ?? '',
      r.diagnosis,
      r.icd10Code ?? '',
      OUTCOME_LABEL[r.reviewOutcome] ?? r.reviewOutcome,
      bool(r.communicatedWithRelatives),
      arr(r.cobatriceDomains),
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
      r.reflection ?? '',
    )
  );
  return [sectionHeader('Ward Reviews', records.length), row(...cols), ...dataRows].join('\n');
}

function transfersSection(records: TransferLog[]): string {
  const cols = [
    'Date', 'Age', 'Sex', 'Diagnosis', 'ICD-10',
    'Transfer Type', 'Transfer Mode', 'From', 'To', 'Level of Care',
    'Procedures During Transfer', 'Communication with Relatives',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Reflection',
  ];
  const TYPE_LABEL: Record<string, string> = {
    inter_hospital: 'Inter-hospital',
    intra_hospital: 'Intra-hospital',
  };
  const MODE_LABEL: Record<string, string> = {
    land_ambulance: 'Land ambulance',
    air_helicopter: 'Air — helicopter',
    air_fixed_wing: 'Air — fixed wing',
    other: 'Other',
  };
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.patientAge ?? '',
      r.patientSex ?? '',
      r.diagnosis,
      r.icd10Code ?? '',
      TYPE_LABEL[r.transferType] ?? r.transferType,
      MODE_LABEL[r.transferMode] ?? r.transferMode,
      r.fromLocation ?? '',
      r.toLocation ?? '',
      r.levelOfCare ? `Level ${r.levelOfCare}` : '',
      arr(r.proceduresDuringTransfer),
      bool(r.communicatedWithRelatives),
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
      r.reflection ?? '',
    )
  );
  return [sectionHeader('Transfers', records.length), row(...cols), ...dataRows].join('\n');
}

function edSection(records: EDAttendanceLog[]): string {
  const cols = [
    'Date', 'Age', 'Sex', 'Diagnosis', 'ICD-10',
    'Presenting Category', 'Cardiac Arrest', 'ICU Admission',
    'Communication with Relatives', 'CoBaTrICE Domains',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Reflection',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.patientAge ?? '',
      r.patientSex ?? '',
      r.diagnosis,
      r.icd10Code ?? '',
      r.presentingCategory ?? '',
      bool(r.cardiacArrest),
      bool(r.icuAdmission),
      bool(r.communicatedWithRelatives),
      arr(r.cobatriceDomains),
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
      r.reflection ?? '',
    )
  );
  return [sectionHeader('ED Attendances', records.length), row(...cols), ...dataRows].join('\n');
}

function medicinePlacementsSection(records: MedicinePlacementLog[]): string {
  const cols = [
    'Start Date', 'End Date', 'Specialty', 'Hospital', 'Ward',
    'Patient Count', 'Teaching Delivered', 'Teaching Recipient', 'CoBaTrICE Domains',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Reflection',
  ];
  const dataRows = records.map((r) =>
    row(
      r.startDate,
      r.endDate ?? '',
      r.specialty,
      r.hospital ?? '',
      r.ward ?? '',
      r.patientCount != null ? String(r.patientCount) : '',
      bool(r.teachingDelivered),
      r.teachingRecipient ?? '',
      arr(r.cobatriceDomains),
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
      r.reflection ?? '',
    )
  );
  return [sectionHeader('Medicine Placements', records.length), row(...cols), ...dataRows].join('\n');
}

function airwaySection(records: AirwayLog[]): string {
  const cols = [
    'Date', 'RSI', 'Induction Agent', 'NMB Agent',
    'Device', 'Tube Size (mm ID)', 'Tube Type',
    'Attempts', 'Success', 'Cormack-Lehane Grade',
    'DAE Used', 'DAE Items',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)', 'Notes',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      bool(r.isRsi),
      r.inductionAgent ?? r.inductionAgentOther ?? '',
      r.neuromuscularAgent ?? r.neuromuscularAgentOther ?? '',
      r.device ?? '',
      r.tubeSize != null ? String(r.tubeSize) : '',
      r.tubeType ?? '',
      String(r.attempts),
      bool(r.success),
      r.cormackLehaneGrade ?? '',
      bool(r.daeUsed),
      arr(r.daeItems),
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
      r.notes ?? '',
    )
  );
  return [sectionHeader('Airway Management', records.length), row(...cols), ...dataRows].join('\n');
}

function arterialLineSection(records: ArterialLineLog[]): string {
  const cols = [
    'Date', 'Site', 'USS Guided', 'Attempts', 'Success',
    'Complications', 'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.site,
      bool(r.ussGuided),
      String(r.attempts),
      bool(r.success),
      r.complications ?? '',
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
    )
  );
  return [sectionHeader('Arterial Lines', records.length), row(...cols), ...dataRows].join('\n');
}

function cvcSection(records: CVCLog[]): string {
  const cols = [
    'Date', 'Site', 'Second CVC', 'Vascath', 'USS Guided',
    'Attempts', 'Success', 'Complications',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.site,
      bool(r.isSecondCVC),
      bool(r.isVascath),
      bool(r.ussGuided),
      String(r.attempts),
      bool(r.success),
      r.complications ?? '',
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
    )
  );
  return [sectionHeader('Central Venous Catheters', records.length), row(...cols), ...dataRows].join('\n');
}

function ussSection(records: USSLog[]): string {
  const cols = [
    'Date', 'Study Type', 'Performed', 'Formal Report', 'Findings',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.studyType,
      bool(r.performed),
      bool(r.formalReport),
      r.findings ?? '',
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
    )
  );
  return [sectionHeader('Ultrasound Studies', records.length), row(...cols), ...dataRows].join('\n');
}

function regionalBlockSection(records: RegionalBlockLog[]): string {
  const cols = [
    'Date', 'Block Type', 'USS Guided', 'Catheter',
    'Attempts', 'Success', 'Complications',
    'Supervision Level', 'Supervisor (ID)', 'Supervisor (off-system)',
  ];
  const dataRows = records.map((r) =>
    row(
      r.date,
      r.blockType === 'other' ? (r.blockTypeOther ?? 'Other') : r.blockType,
      bool(r.ussGuided),
      bool(r.catheter),
      String(r.attempts),
      bool(r.success),
      r.complications ?? '',
      r.supervisionLevel,
      r.supervisorUserId ?? '',
      r.externalSupervisorName ?? '',
    )
  );
  return [sectionHeader('Regional Blocks', records.length), row(...cols), ...dataRows].join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ARCPData {
  cases: CaseLog[];
  wardReviews: WardReviewLog[];
  transfers: TransferLog[];
  edAttendances: EDAttendanceLog[];
  medicinePlacements: MedicinePlacementLog[];
  airways: AirwayLog[];
  arterialLines: ArterialLineLog[];
  cvcs: CVCLog[];
  ussStudies: USSLog[];
  regionalBlocks: RegionalBlockLog[];
}

/** Converts all logbook data into a multi-section ARCP CSV string. */
export function toARCPCsv(data: ARCPData): string {
  const total =
    data.cases.length + data.wardReviews.length + data.transfers.length +
    data.edAttendances.length + data.medicinePlacements.length +
    data.airways.length + data.arterialLines.length + data.cvcs.length +
    data.ussStudies.length + data.regionalBlocks.length;

  const header = [
    `ICU Logbook — ARCP Portfolio Export`,
    `Generated: ${new Date().toISOString()}`,
    `Total records: ${total}`,
    `Format: CSV (RFC 4180) — import into Excel / Numbers / Google Sheets`,
    '',
  ].join('\n');

  const sections = [
    casesSection(data.cases),
    wardReviewsSection(data.wardReviews),
    transfersSection(data.transfers),
    edSection(data.edAttendances),
    medicinePlacementsSection(data.medicinePlacements),
    airwaySection(data.airways),
    arterialLineSection(data.arterialLines),
    cvcSection(data.cvcs),
    ussSection(data.ussStudies),
    regionalBlockSection(data.regionalBlocks),
  ];

  return header + sections.join('\n\n');
}
