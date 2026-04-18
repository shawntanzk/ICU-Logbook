import { CaseLog } from '../../models/CaseLog';
import { ProcedureLog } from '../../models/ProcedureLog';
import { CodedValue } from '../../models/CodedValue';
import { caseIRI, procedureIRI, personIRI } from '../../data/codeSystems';
import { deidentifyCase, deidentifyProcedure, DeidentifyOptions } from '../DeidentifyService';

// Converts logbook records into an HL7 FHIR R4 Bundle (searchset / collection).
// Each CaseLog becomes an Encounter + Condition + one AssessmentReport-equivalent
// Observation (for supervision level) + provenance. Each ProcedureLog becomes a
// Procedure resource linked back to its parent Encounter.
//
// This is deliberately a pure serialiser — no network calls — so it can run
// offline and be wrapped by any transport (file save, HTTPS POST, etc.).

function codeableConcept(v: CodedValue | null | undefined) {
  if (!v) return undefined;
  const codings = [{ system: v.system, code: v.code, display: v.display }];
  if (v.mappings) {
    for (const m of v.mappings) {
      codings.push({ system: m.system, code: m.code, display: m.display });
    }
  }
  return { coding: codings, text: v.display };
}

interface BundleEntry {
  fullUrl: string;
  resource: Record<string, unknown>;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  meta: {
    profile: string[];
    tag?: { system: string; code: string; display?: string }[];
  };
  entry: BundleEntry[];
}

export interface ExportOptions extends DeidentifyOptions {
  anonymiseUserId?: boolean; // default true — replace user IRI with a salted hash
}

function caseToFhir(c: CaseLog, opts: ExportOptions): BundleEntry[] {
  const deid = deidentifyCase(c, opts);
  const encounterIri = caseIRI(deid.id);
  const subject = opts.anonymiseUserId === false
    ? personIRI(deid.provenance.deviceId)
    : { reference: 'Patient/anonymous' };

  const encounter = {
    resourceType: 'Encounter',
    id: deid.id,
    identifier: [{ system: 'https://w3id.org/iculogbook/id/case', value: deid.id }],
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'IMP',
      display: 'inpatient encounter',
    },
    period: { start: deid.date },
    subject,
    reasonCode: deid.diagnosisCoded ? [codeableConcept(deid.diagnosisCoded)] : [],
    extension: deid.organSystemsCoded.map((o) => ({
      url: 'https://w3id.org/iculogbook/ontology/organ-system',
      valueCodeableConcept: codeableConcept(o),
    })),
    meta: {
      tag: [
        { system: 'https://w3id.org/iculogbook/consent', code: deid.consentStatus },
        { system: 'https://spdx.org/licenses/', code: deid.license },
      ],
    },
  };

  const condition = deid.diagnosisCoded
    ? {
        resourceType: 'Condition',
        id: `${deid.id}-dx`,
        subject,
        encounter: { reference: `Encounter/${deid.id}` },
        code: codeableConcept(deid.diagnosisCoded),
        recordedDate: deid.date,
        note: deid.diagnosis ? [{ text: deid.diagnosis }] : undefined,
      }
    : null;

  // Supervision level → Observation (Ottawa EPA)
  const supervisionObs = {
    resourceType: 'Observation',
    id: `${deid.id}-supervision`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'exam',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'https://w3id.org/iculogbook/ontology',
          code: 'supervision-level',
          display: 'Supervision level (Ottawa EPA)',
        },
      ],
    },
    subject,
    encounter: { reference: `Encounter/${deid.id}` },
    effectiveDateTime: deid.date,
    valueCodeableConcept: codeableConcept(deid.supervisionLevelCoded),
  };

  // CoBaTrICE competencies → Observation
  const cobatriceObs = deid.cobatriceDomainsCoded.map((d, i) => ({
    resourceType: 'Observation',
    id: `${deid.id}-cobatrice-${i}`,
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://w3id.org/iculogbook/ontology',
          code: 'cobatrice-domain',
          display: 'CoBaTrICE domain',
        },
      ],
    },
    subject,
    encounter: { reference: `Encounter/${deid.id}` },
    effectiveDateTime: deid.date,
    valueCodeableConcept: codeableConcept(d),
  }));

  const provenance = {
    resourceType: 'Provenance',
    id: `${deid.id}-prov`,
    target: [{ reference: `Encounter/${deid.id}` }],
    recorded: deid.createdAt,
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'author',
            },
          ],
        },
        who: subject,
      },
    ],
    entity: [
      {
        role: 'source',
        what: {
          identifier: {
            system: 'https://w3id.org/iculogbook/device',
            value: deid.provenance.deviceId,
          },
          display: `ICU Logbook ${deid.provenance.appVersion} on ${deid.provenance.platform}`,
        },
      },
    ],
  };

  const quality = {
    resourceType: 'Observation',
    id: `${deid.id}-quality`,
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://w3id.org/iculogbook/ontology',
          code: 'record-quality',
          display: 'Record quality scores',
        },
      ],
    },
    subject,
    component: [
      {
        code: { text: 'completeness' },
        valueQuantity: { value: deid.quality.completeness },
      },
      {
        code: { text: 'codingConfidence' },
        valueQuantity: { value: deid.quality.codingConfidence },
      },
    ],
  };

  const entries: BundleEntry[] = [
    { fullUrl: encounterIri, resource: encounter },
    ...(condition ? [{ fullUrl: `${encounterIri}/condition`, resource: condition }] : []),
    { fullUrl: `${encounterIri}/supervision`, resource: supervisionObs },
    ...cobatriceObs.map((r, i) => ({ fullUrl: `${encounterIri}/cobatrice-${i}`, resource: r })),
    { fullUrl: `${encounterIri}/provenance`, resource: provenance },
    { fullUrl: `${encounterIri}/quality`, resource: quality },
  ];
  return entries;
}

function procedureToFhir(p: ProcedureLog, opts: ExportOptions): BundleEntry {
  const deid = deidentifyProcedure(p, opts);
  const iri = procedureIRI(deid.id);
  return {
    fullUrl: iri,
    resource: {
      resourceType: 'Procedure',
      id: deid.id,
      status: deid.success ? 'completed' : 'not-done',
      code: {
        coding: [
          {
            system: deid.procedureTypeCoded.system,
            code: deid.procedureTypeCoded.code,
            display: deid.procedureTypeCoded.display,
          },
        ],
      },
      subject: { reference: 'Patient/anonymous' },
      encounter: deid.caseId ? { reference: `Encounter/${deid.caseId}` } : undefined,
      performedDateTime: deid.createdAt,
      note: deid.complications ? [{ text: deid.complications }] : undefined,
      extension: [
        {
          url: 'https://w3id.org/iculogbook/ontology/attempts',
          valueInteger: deid.attempts,
        },
      ],
      meta: {
        tag: [
          { system: 'https://w3id.org/iculogbook/consent', code: deid.consentStatus },
          { system: 'https://spdx.org/licenses/', code: deid.license },
        ],
      },
    },
  };
}

export function casesToFhirBundle(
  cases: CaseLog[],
  procedures: ProcedureLog[] = [],
  opts: ExportOptions = {}
): FHIRBundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: {
      profile: ['https://w3id.org/iculogbook/fhir/StructureDefinition/LogbookBundle'],
    },
    entry: [
      ...cases.flatMap((c) => caseToFhir(c, opts)),
      ...procedures.map((p) => procedureToFhir(p, opts)),
    ],
  };
}
