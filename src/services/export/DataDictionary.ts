// Machine-readable data dictionary — generated from the in-code schema so
// it never drifts from what's actually saved. Shipped alongside every
// export so buyers have a self-describing codebook.

import { CODE_SYSTEMS } from '../../data/codeSystems';

export interface DictionaryField {
  name: string;
  type: string;
  cardinality: '1' | '0..1' | '1..*' | '0..*';
  description: string;
  codingSystem?: string;
  example?: unknown;
}

export interface DictionaryTable {
  name: string;
  iri: string;
  fields: DictionaryField[];
}

export const DATA_DICTIONARY: DictionaryTable[] = [
  {
    name: 'CaseLog',
    iri: 'https://w3id.org/iculogbook/ontology#CaseLog',
    fields: [
      { name: 'id', type: 'IRI', cardinality: '1', description: 'Globally-unique case identifier (persistent).', example: 'https://w3id.org/iculogbook/id/case/7f…' },
      { name: 'date', type: 'xsd:date', cardinality: '1', description: 'Date of the encounter, ISO-8601. Shifted to epoch-week in commercial exports.' },
      { name: 'diagnosis', type: 'string', cardinality: '1', description: 'Free-text diagnosis (scrubbed for PII on export).' },
      { name: 'diagnosisCoded', type: 'Concept', cardinality: '0..1', description: 'Terminology-bound diagnosis.', codingSystem: `${CODE_SYSTEMS.icd10}, ${CODE_SYSTEMS.snomed}` },
      { name: 'organSystems', type: 'Concept', cardinality: '1..*', description: 'Affected organ systems.', codingSystem: CODE_SYSTEMS.snomed },
      { name: 'cobatriceDomains', type: 'Concept', cardinality: '1..*', description: 'CoBaTrICE competency domains exercised.', codingSystem: CODE_SYSTEMS.cobatrice },
      { name: 'supervisionLevel', type: 'Concept', cardinality: '1', description: 'Ottawa Entrustable Professional Activity level.', codingSystem: CODE_SYSTEMS.ottawaEpa },
      { name: 'reflection', type: 'string', cardinality: '0..1', description: 'Free-text reflection (scrubbed for PII on export).' },
      { name: 'createdAt', type: 'xsd:dateTime', cardinality: '1', description: 'Record creation timestamp.' },
      { name: 'updatedAt', type: 'xsd:dateTime', cardinality: '1', description: 'Last modification timestamp.' },
      { name: 'provenance', type: 'prov:Activity', cardinality: '1', description: 'App version, schema version, platform, locale, timezone, device ID.' },
      { name: 'quality', type: 'Quality', cardinality: '1', description: 'Completeness (0–1) and codingConfidence (0–1) scores.' },
      { name: 'consent', type: 'Consent', cardinality: '1', description: 'One of {none, anonymous, research, commercial}.' },
      { name: 'license', type: 'SPDX', cardinality: '1', description: 'SPDX license identifier (default CC-BY-NC-4.0).' },
    ],
  },
  {
    name: 'ProcedureLog',
    iri: 'https://w3id.org/iculogbook/ontology#ProcedureLog',
    fields: [
      { name: 'id', type: 'IRI', cardinality: '1', description: 'Globally-unique procedure identifier.' },
      { name: 'procedureType', type: 'Concept', cardinality: '1', description: 'Procedure performed.', codingSystem: CODE_SYSTEMS.snomed },
      { name: 'attempts', type: 'xsd:integer', cardinality: '1', description: 'Number of attempts (1..20).' },
      { name: 'success', type: 'xsd:boolean', cardinality: '1', description: 'Whether the procedure succeeded.' },
      { name: 'complications', type: 'string', cardinality: '0..1', description: 'Free-text complications.' },
      { name: 'caseId', type: 'IRI', cardinality: '0..1', description: 'Optional parent-case reference.' },
      { name: 'provenance', type: 'prov:Activity', cardinality: '1', description: 'As per CaseLog.' },
      { name: 'quality', type: 'Quality', cardinality: '1', description: 'As per CaseLog.' },
    ],
  },
];

export function dictionaryToMarkdown(): string {
  const lines: string[] = ['# ICU Logbook Data Dictionary', ''];
  lines.push(`_Generated from schema v2.0.0_`, '');
  for (const table of DATA_DICTIONARY) {
    lines.push(`## ${table.name}`, '');
    lines.push(`IRI: \`${table.iri}\``, '');
    lines.push('| Field | Type | Cardinality | Coding | Description |');
    lines.push('|---|---|---|---|---|');
    for (const f of table.fields) {
      lines.push(
        `| ${f.name} | ${f.type} | ${f.cardinality} | ${f.codingSystem ?? '—'} | ${f.description} |`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
