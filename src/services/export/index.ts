import { CaseService } from '../CaseService';
import { ProcedureService } from '../ProcedureService';
import { casesToFhirBundle, ExportOptions } from './FHIRExporter';
import { casesToOpenEHR } from './OpenEHRExporter';
import { toJsonLD } from './JSONLDExporter';
import { dictionaryToMarkdown, DATA_DICTIONARY } from './DataDictionary';
import { CaseLog } from '../../models/CaseLog';
import { ProcedureLog } from '../../models/ProcedureLog';

export type ExportFormat = 'fhir' | 'openehr' | 'jsonld' | 'dictionary';

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
