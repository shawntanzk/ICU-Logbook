import { CaseLog } from '../../models/CaseLog';
import { deidentifyCase, DeidentifyOptions } from '../DeidentifyService';

// Minimal openEHR Composition export, targeting the INTENSIVE_CARE_EPISODE
// + problem-diagnosis archetypes. This is NOT a full openEHR REST commit —
// it's a structured JSON document that an openEHR adapter on the server
// side can ingest into a CDR (Clinical Data Repository).

export interface OpenEHRComposition {
  _type: 'COMPOSITION';
  name: { value: 'ICU Logbook Episode' };
  archetype_node_id: string;
  uid: { value: string };
  language: { code_string: 'en' };
  territory: { code_string: string };
  composer: { _type: 'PARTY_IDENTIFIED'; name: 'ICU Logbook' };
  context: {
    start_time: { value: string };
    setting: {
      value: 'secondary medical care';
      defining_code: {
        terminology_id: { value: 'openehr' };
        code_string: '228';
      };
    };
  };
  content: unknown[];
}

function codedText(display: string, code: string, terminology: string) {
  return {
    _type: 'DV_CODED_TEXT',
    value: display,
    defining_code: {
      _type: 'CODE_PHRASE',
      terminology_id: { value: terminology },
      code_string: code,
    },
  };
}

export function caseToOpenEHR(c: CaseLog, opts: DeidentifyOptions = {}): OpenEHRComposition {
  const deid = deidentifyCase(c, opts);
  const content: unknown[] = [];

  // Problem / Diagnosis EVALUATION (openEHR-EHR-EVALUATION.problem_diagnosis.v1)
  if (deid.diagnosisCoded) {
    content.push({
      _type: 'EVALUATION',
      name: { value: 'Problem/Diagnosis' },
      archetype_node_id: 'openEHR-EHR-EVALUATION.problem_diagnosis.v1',
      data: {
        _type: 'ITEM_TREE',
        items: [
          {
            _type: 'ELEMENT',
            name: { value: 'Problem/Diagnosis name' },
            value: codedText(
              deid.diagnosisCoded.display,
              deid.diagnosisCoded.code,
              deid.diagnosisCoded.system.includes('snomed') ? 'SNOMED-CT' : 'ICD-10'
            ),
          },
          ...(deid.diagnosisCoded.mappings?.map((m) => ({
            _type: 'ELEMENT',
            name: { value: 'Alternative coding' },
            value: codedText(m.display, m.code, m.system.includes('snomed') ? 'SNOMED-CT' : 'ICD-10'),
          })) ?? []),
        ],
      },
    });
  }

  // Organ-systems affected — captured as clinical-context ELEMENTs
  for (const os of deid.organSystemsCoded) {
    content.push({
      _type: 'OBSERVATION',
      name: { value: 'Organ system affected' },
      archetype_node_id: 'openEHR-EHR-OBSERVATION.organ_system.v0',
      data: {
        _type: 'ITEM_TREE',
        items: [
          {
            _type: 'ELEMENT',
            name: { value: 'System' },
            value: codedText(os.display, os.code, 'SNOMED-CT'),
          },
        ],
      },
    });
  }

  // Entrustment / supervision — training-context EVALUATION
  content.push({
    _type: 'EVALUATION',
    name: { value: 'Entrustment level' },
    archetype_node_id: 'iculogbook-EHR-EVALUATION.entrustment.v0',
    data: {
      _type: 'ITEM_TREE',
      items: [
        {
          _type: 'ELEMENT',
          name: { value: 'Ottawa EPA level' },
          value: codedText(
            deid.supervisionLevelCoded.display,
            deid.supervisionLevelCoded.code,
            'ottawa-epa'
          ),
        },
      ],
    },
  });

  return {
    _type: 'COMPOSITION',
    name: { value: 'ICU Logbook Episode' },
    archetype_node_id: 'iculogbook-EHR-COMPOSITION.icu_episode.v0',
    uid: { value: deid.id },
    language: { code_string: 'en' },
    territory: { code_string: 'GB' },
    composer: { _type: 'PARTY_IDENTIFIED', name: 'ICU Logbook' },
    context: {
      start_time: { value: deid.date },
      setting: {
        value: 'secondary medical care',
        defining_code: { terminology_id: { value: 'openehr' }, code_string: '228' },
      },
    },
    content,
  };
}

export function casesToOpenEHR(cases: CaseLog[], opts: DeidentifyOptions = {}): OpenEHRComposition[] {
  return cases.map((c) => caseToOpenEHR(c, opts));
}
