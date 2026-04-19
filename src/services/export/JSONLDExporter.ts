import { CaseLog } from '../../models/CaseLog';
import { ProcedureLog } from '../../models/ProcedureLog';
import { CodedValue } from '../../models/CodedValue';
import { caseIRI, procedureIRI, CODE_SYSTEMS } from '../../data/codeSystems';
import { deidentifyCase, deidentifyProcedure, DeidentifyOptions } from '../DeidentifyService';

// JSON-LD export with a stable @context pointing at the published context
// document. Every instance becomes a resolvable IRI. Consumers can parse
// the document as RDF directly (JSON-LD 1.1 → N-Quads → triple store).

const CONTEXT_URL = 'https://w3id.org/iculogbook/context/v1.jsonld';

function codedValueToJsonLD(v: CodedValue | null): unknown {
  if (!v) return null;
  return {
    '@type': 'Concept',
    system: v.system,
    code: v.code,
    display: v.display,
    mappings: v.mappings ?? [],
  };
}

export interface JSONLDDocument {
  '@context': string;
  '@graph': unknown[];
}

export function caseToJsonLD(c: CaseLog, opts: DeidentifyOptions = {}): unknown {
  const deid = deidentifyCase(c, opts);
  return {
    '@id': caseIRI(deid.id),
    '@type': 'CaseLog',
    schemaVersion: deid.schemaVersion,
    date: deid.date,
    diagnosis: deid.diagnosis,
    diagnosisCoded: codedValueToJsonLD(deid.diagnosisCoded),
    organSystems: deid.organSystemsCoded.map(codedValueToJsonLD),
    cobatriceDomains: deid.cobatriceDomainsCoded.map(codedValueToJsonLD),
    supervisionLevel: codedValueToJsonLD(deid.supervisionLevelCoded),
    reflection: deid.reflection,
    createdAt: deid.createdAt,
    updatedAt: deid.updatedAt,
    provenance: {
      '@type': 'prov:Activity',
      appVersion: deid.provenance.appVersion,
      schemaVersion: deid.provenance.schemaVersion,
      platform: deid.provenance.platform,
      locale: deid.provenance.locale,
      timezone: deid.provenance.timezone,
      deviceId: deid.provenance.deviceId,
    },
    quality: deid.quality,
    consent: deid.consentStatus,
    license: `https://spdx.org/licenses/${deid.license}`,
  };
}

export function procedureToJsonLD(p: ProcedureLog, opts: DeidentifyOptions = {}): unknown {
  const deid = deidentifyProcedure(p, opts);
  return {
    '@id': procedureIRI(deid.id),
    '@type': 'ProcedureLog',
    schemaVersion: deid.schemaVersion,
    procedureType: codedValueToJsonLD(deid.procedureTypeCoded),
    attempts: deid.attempts,
    success: deid.success,
    complications: deid.complications,
    caseId: deid.caseId ? caseIRI(deid.caseId) : null,
    createdAt: deid.createdAt,
    updatedAt: deid.updatedAt,
    provenance: deid.provenance,
    quality: deid.quality,
    consent: deid.consentStatus,
    license: `https://spdx.org/licenses/${deid.license}`,
  };
}

export function toJsonLD(
  cases: CaseLog[],
  procedures: ProcedureLog[] = [],
  opts: DeidentifyOptions = {}
): JSONLDDocument {
  return {
    '@context': CONTEXT_URL,
    '@graph': [
      ...cases.map((c) => caseToJsonLD(c, opts)),
      ...procedures.map((p) => procedureToJsonLD(p, opts)),
    ],
  };
}

// Inline copy of the context — useful for offline exports. Keeps the
// published URL as the canonical source but ships a snapshot in the bundle.
export const INLINE_CONTEXT = {
  '@version': 1.1,
  iculogbook: CODE_SYSTEMS.iculogbook + '/',
  prov: 'http://www.w3.org/ns/prov#',
  dcterms: 'http://purl.org/dc/terms/',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  // OBO Foundry + Monarch Initiative Biolink — make the export joinable
  // with MONDO, UBERON, HP, and the Monarch KG without a separate mapping step.
  obo: 'http://purl.obolibrary.org/obo/',
  MONDO: 'http://purl.obolibrary.org/obo/MONDO_',
  UBERON: 'http://purl.obolibrary.org/obo/UBERON_',
  HP: 'http://purl.obolibrary.org/obo/HP_',
  NCIT: 'http://purl.obolibrary.org/obo/NCIT_',
  CHEBI: 'http://purl.obolibrary.org/obo/CHEBI_',
  biolink: 'https://w3id.org/biolink/vocab/',
  CaseLog: { '@id': 'iculogbook:CaseLog', '@type': 'biolink:ClinicalEntity' },
  ProcedureLog: { '@id': 'iculogbook:ProcedureLog', '@type': 'biolink:ClinicalIntervention' },
  Concept: 'iculogbook:Concept',
  schemaVersion: { '@id': 'dcterms:hasVersion', '@type': 'xsd:string' },
  date: { '@id': 'iculogbook:date', '@type': 'xsd:date' },
  diagnosis: 'iculogbook:diagnosis',
  diagnosisCoded: { '@id': 'iculogbook:diagnosisCoded', '@type': '@id' },
  organSystems: { '@id': 'iculogbook:organSystem', '@container': '@set' },
  cobatriceDomains: { '@id': 'iculogbook:cobatriceDomain', '@container': '@set' },
  supervisionLevel: 'iculogbook:supervisionLevel',
  reflection: 'iculogbook:reflection',
  provenance: { '@id': 'prov:wasGeneratedBy', '@type': '@id' },
  quality: 'iculogbook:quality',
  consent: 'iculogbook:consent',
  license: { '@id': 'dcterms:license', '@type': '@id' },
  procedureType: 'iculogbook:procedureType',
  attempts: { '@id': 'iculogbook:attempts', '@type': 'xsd:integer' },
  success: { '@id': 'iculogbook:success', '@type': 'xsd:boolean' },
  complications: 'iculogbook:complications',
  caseId: { '@id': 'iculogbook:caseId', '@type': '@id' },
  createdAt: { '@id': 'dcterms:created', '@type': 'xsd:dateTime' },
  updatedAt: { '@id': 'dcterms:modified', '@type': 'xsd:dateTime' },
  system: { '@id': 'iculogbook:system', '@type': '@id' },
  code: 'iculogbook:code',
  display: 'iculogbook:display',
  mappings: { '@id': 'iculogbook:mapping', '@container': '@set' },
};
