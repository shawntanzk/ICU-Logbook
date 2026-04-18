// Canonical URIs for every code system referenced by the app.
// These strings are the `system` half of every CodedValue and appear verbatim
// in FHIR/JSON-LD exports, so changing them is a breaking data-product change.

export const CODE_SYSTEMS = {
  snomed: 'http://snomed.info/sct',
  icd10: 'http://hl7.org/fhir/sid/icd-10',
  icd10cm: 'http://hl7.org/fhir/sid/icd-10-cm',
  loinc: 'http://loinc.org',
  rxnorm: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  ucum: 'http://unitsofmeasure.org',
  cobatrice: 'https://w3id.org/iculogbook/cobatrice',
  ottawaEpa: 'https://w3id.org/iculogbook/ottawa-epa',
  iculogbook: 'https://w3id.org/iculogbook/ontology',
} as const;

export type CodeSystem = (typeof CODE_SYSTEMS)[keyof typeof CODE_SYSTEMS];

// Persistent-IRI namespace for resource instances exported from the app.
// Every case/procedure/person gets a URI under this prefix. Registered under
// w3id.org so the app publisher can change the underlying hosting without
// breaking downstream consumers.
export const IRI_NAMESPACE = 'https://w3id.org/iculogbook/id';

export function caseIRI(id: string): string {
  return `${IRI_NAMESPACE}/case/${id}`;
}

export function procedureIRI(id: string): string {
  return `${IRI_NAMESPACE}/procedure/${id}`;
}

export function personIRI(id: string): string {
  return `${IRI_NAMESPACE}/person/${id}`;
}
