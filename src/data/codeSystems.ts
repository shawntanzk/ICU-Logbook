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

  // OBO Foundry ontologies — persistent PURLs. Using these makes the
  // exported dataset joinable with the Monarch Initiative KG and any
  // other OBO-aligned resource.
  mondo: 'http://purl.obolibrary.org/obo/mondo.owl',       // Monarch Disease Ontology
  uberon: 'http://purl.obolibrary.org/obo/uberon.owl',     // Anatomy
  hp: 'http://purl.obolibrary.org/obo/hp.owl',             // Human Phenotype Ontology
  ncit: 'http://purl.obolibrary.org/obo/ncit.owl',         // NCI Thesaurus (procedures, drugs)
  chebi: 'http://purl.obolibrary.org/obo/chebi.owl',       // Chemicals (future: drug toxicology)
  obi: 'http://purl.obolibrary.org/obo/obi.owl',           // Ontology for Biomedical Investigations
  envo: 'http://purl.obolibrary.org/obo/envo.owl',         // Environment Ontology

  // Biolink Model — the schema Monarch uses to align all the above.
  biolink: 'https://w3id.org/biolink/vocab/',
} as const;

// Term-level PURL builders. OBO term URIs follow the pattern
// http://purl.obolibrary.org/obo/<PREFIX>_<LOCAL_ID>. Using the term PURL
// (not the ontology PURL) is what makes the data actually joinable.
export const OBO_TERM_BASE = 'http://purl.obolibrary.org/obo/';

export function oboTermIRI(prefix: 'MONDO' | 'UBERON' | 'HP' | 'NCIT' | 'CHEBI' | 'OBI' | 'ENVO', localId: string): string {
  // localId may be passed as "0005737" or "MONDO:0005737"; normalise.
  const id = localId.includes(':') ? localId.split(':')[1] : localId;
  return `${OBO_TERM_BASE}${prefix}_${id}`;
}

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
