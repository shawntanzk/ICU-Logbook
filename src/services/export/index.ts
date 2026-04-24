import { CaseService } from '../CaseService';
import { ProcedureService } from '../ProcedureService';
import { WardReviewService } from '../WardReviewService';
import { TransferService } from '../TransferService';
import { EDAttendanceService } from '../EDAttendanceService';
import { MedicinePlacementService } from '../MedicinePlacementService';
import { AirwayService } from '../AirwayService';
import { ArterialLineService } from '../ArterialLineService';
import { CVCService } from '../CVCService';
import { USSService } from '../USSService';
import { RegionalBlockService } from '../RegionalBlockService';
import { casesToFhirBundle, ExportOptions } from './FHIRExporter';
import { casesToOpenEHR } from './OpenEHRExporter';
import { toJsonLD } from './JSONLDExporter';
import { dictionaryToMarkdown, DATA_DICTIONARY } from './DataDictionary';
import { toARCPCsv } from './ARCPExporter';
import { CaseLog } from '../../models/CaseLog';
import { ProcedureLog } from '../../models/ProcedureLog';

export type ExportFormat = 'fhir' | 'openehr' | 'jsonld' | 'dictionary' | 'arcp_csv';

export interface ExportBundle {
  format: ExportFormat;
  mediaType: string;
  filename: string;
  payload: string;
  recordCount: number;
}

// Orchestrator — pulls all records, filters by consent level, and emits
// the requested format as a single string payload ready to save or upload.
export async function exportAll(
  format: ExportFormat,
  opts: ExportOptions = {}
): Promise<ExportBundle> {
  const cases = await CaseService.findAll();
  const procedures = await ProcedureService.findAll();

  // Default policy: exclude records whose consent is "none". Commercial
  // exports only include "commercial" or "research"; anonymous research
  // exports include everything except "none".
  const allowed = new Set<CaseLog['consentStatus']>(['anonymous', 'research', 'commercial']);
  const filteredCases = cases.filter((c) => allowed.has(c.consentStatus));
  const filteredProcs: ProcedureLog[] = procedures.filter((p) =>
    allowed.has(p.consentStatus)
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  switch (format) {
    case 'arcp_csv': {
      // Load all sub-entity tables in parallel — no de-identification is
      // applied (this is the trainee's own portfolio export, not a research
      // dataset). Consent filtering still applies to case_logs.
      const [
        wardReviews, transfers, edAttendances, medicinePlacements,
        airways, arterialLines, cvcs, ussStudies, regionalBlocks,
      ] = await Promise.all([
        WardReviewService.findAll(),
        TransferService.findAll(),
        EDAttendanceService.findAll(),
        MedicinePlacementService.findAll(),
        AirwayService.findAll(),
        ArterialLineService.findAll(),
        CVCService.findAll(),
        USSService.findAll(),
        RegionalBlockService.findAll(),
      ]);
      const csv = toARCPCsv({
        cases: filteredCases,
        wardReviews,
        transfers,
        edAttendances,
        medicinePlacements,
        airways,
        arterialLines,
        cvcs,
        ussStudies,
        regionalBlocks,
      });
      const totalRecords =
        filteredCases.length + wardReviews.length + transfers.length +
        edAttendances.length + medicinePlacements.length + airways.length +
        arterialLines.length + cvcs.length + ussStudies.length + regionalBlocks.length;
      return {
        format,
        mediaType: 'text/csv',
        filename: `iculogbook-arcp-${timestamp}.csv`,
        payload: csv,
        recordCount: totalRecords,
      };
    }
    case 'fhir': {
      const bundle = casesToFhirBundle(filteredCases, filteredProcs, opts);
      return {
        format,
        mediaType: 'application/fhir+json',
        filename: `iculogbook-fhir-${timestamp}.json`,
        payload: JSON.stringify(bundle, null, 2),
        recordCount: bundle.entry.length,
      };
    }
    case 'openehr': {
      const payload = casesToOpenEHR(filteredCases, opts);
      return {
        format,
        mediaType: 'application/openehr+json',
        filename: `iculogbook-openehr-${timestamp}.json`,
        payload: JSON.stringify(payload, null, 2),
        recordCount: payload.length,
      };
    }
    case 'jsonld': {
      const doc = toJsonLD(filteredCases, filteredProcs, opts);
      return {
        format,
        mediaType: 'application/ld+json',
        filename: `iculogbook-jsonld-${timestamp}.json`,
        payload: JSON.stringify(doc, null, 2),
        recordCount: (doc['@graph'] as unknown[]).length,
      };
    }
    case 'dictionary': {
      return {
        format,
        mediaType: 'text/markdown',
        filename: `iculogbook-dictionary.md`,
        payload: dictionaryToMarkdown(),
        recordCount: DATA_DICTIONARY.length,
      };
    }
  }
}

export { casesToFhirBundle, casesToOpenEHR, toJsonLD, dictionaryToMarkdown };
