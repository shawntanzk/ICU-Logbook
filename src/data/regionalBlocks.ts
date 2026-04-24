import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Regional anaesthesia / nerve block catalogue.
// 45-item list matching the NW Deanery ICM logbook.
// SNOMED CT codes from the "Nerve block" hierarchy.

export interface RegionalBlockDef {
  local: string;
  region: 'upper_limb' | 'lower_limb' | 'trunk' | 'head_neck' | 'neuraxial' | 'other';
  snomed: { code: string; display: string } | null;
}

export const REGIONAL_BLOCK_DEFS: RegionalBlockDef[] = [
  // ── Neuraxial ─────────────────────────────────────────────────────────────
  { local: 'Spinal', region: 'neuraxial', snomed: { code: '18946005', display: 'Spinal anaesthesia' } },
  { local: 'Epidural — lumbar', region: 'neuraxial', snomed: { code: '73418004', display: 'Epidural anaesthesia' } },
  { local: 'Epidural — thoracic', region: 'neuraxial', snomed: { code: '73418004', display: 'Epidural anaesthesia' } },
  { local: 'Epidural — cervical', region: 'neuraxial', snomed: { code: '73418004', display: 'Epidural anaesthesia' } },
  { local: 'Combined spinal-epidural', region: 'neuraxial', snomed: { code: '62427003', display: 'Combined spinal-epidural technique' } },
  { local: 'Caudal', region: 'neuraxial', snomed: { code: '44348004', display: 'Caudal anaesthesia' } },
  // ── Upper limb ────────────────────────────────────────────────────────────
  { local: 'Interscalene brachial plexus', region: 'upper_limb', snomed: { code: '44327003', display: 'Brachial plexus block' } },
  { local: 'Supraclavicular brachial plexus', region: 'upper_limb', snomed: { code: '44327003', display: 'Brachial plexus block' } },
  { local: 'Infraclavicular brachial plexus', region: 'upper_limb', snomed: { code: '44327003', display: 'Brachial plexus block' } },
  { local: 'Axillary brachial plexus', region: 'upper_limb', snomed: { code: '44327003', display: 'Brachial plexus block' } },
  { local: 'Median nerve', region: 'upper_limb', snomed: { code: '57561000', display: 'Median nerve block' } },
  { local: 'Ulnar nerve', region: 'upper_limb', snomed: { code: '81601005', display: 'Ulnar nerve block' } },
  { local: 'Radial nerve', region: 'upper_limb', snomed: { code: '44987005', display: 'Radial nerve block' } },
  { local: 'WALANT (wrist block)', region: 'upper_limb', snomed: null },
  // ── Trunk ─────────────────────────────────────────────────────────────────
  { local: 'Transversus Abdominis Plane (TAP)', region: 'trunk', snomed: { code: '445230003', display: 'Transversus abdominis plane block' } },
  { local: 'Rectus sheath', region: 'trunk', snomed: null },
  { local: 'Erector Spinae Plane (ESP)', region: 'trunk', snomed: null },
  { local: 'PECS I', region: 'trunk', snomed: null },
  { local: 'PECS II / Serratus', region: 'trunk', snomed: null },
  { local: 'Paravertebral', region: 'trunk', snomed: { code: '36701001', display: 'Paravertebral block' } },
  { local: 'Intercostal nerve', region: 'trunk', snomed: { code: '4713003', display: 'Intercostal nerve block' } },
  { local: 'Ilioinguinal / Iliohypogastric', region: 'trunk', snomed: null },
  { local: 'Quadratus Lumborum (QL)', region: 'trunk', snomed: null },
  { local: 'Retrolaminar', region: 'trunk', snomed: null },
  // ── Lower limb ────────────────────────────────────────────────────────────
  { local: 'Femoral nerve', region: 'lower_limb', snomed: { code: '86228008', display: 'Femoral nerve block' } },
  { local: 'Adductor canal (saphenous)', region: 'lower_limb', snomed: null },
  { local: 'Fascia Iliaca', region: 'lower_limb', snomed: { code: '445397009', display: 'Fascia iliaca compartment block' } },
  { local: 'Sciatic nerve — posterior approach', region: 'lower_limb', snomed: { code: '36701001', display: 'Sciatic nerve block' } },
  { local: 'Sciatic nerve — anterior approach', region: 'lower_limb', snomed: { code: '36701001', display: 'Sciatic nerve block' } },
  { local: 'Popliteal sciatic', region: 'lower_limb', snomed: null },
  { local: 'Obturator nerve', region: 'lower_limb', snomed: null },
  { local: 'Lateral femoral cutaneous nerve', region: 'lower_limb', snomed: null },
  { local: 'Ankle block', region: 'lower_limb', snomed: null },
  { local: 'Genicular nerve block (knee)', region: 'lower_limb', snomed: null },
  { local: 'IPACK (interspace between popliteal artery and capsule)', region: 'lower_limb', snomed: null },
  // ── Head / neck ───────────────────────────────────────────────────────────
  { local: 'Superficial cervical plexus', region: 'head_neck', snomed: null },
  { local: 'Deep cervical plexus', region: 'head_neck', snomed: null },
  { local: 'Greater occipital nerve', region: 'head_neck', snomed: null },
  { local: 'Maxillary nerve (infraorbital)', region: 'head_neck', snomed: null },
  { local: 'Trigeminal branch blocks', region: 'head_neck', snomed: null },
  { local: 'Superior laryngeal nerve', region: 'head_neck', snomed: null },
  // ── Other ─────────────────────────────────────────────────────────────────
  { local: 'Stellate ganglion', region: 'other', snomed: null },
  { local: 'Ganglion impar', region: 'other', snomed: null },
  { local: 'Coeliac plexus', region: 'other', snomed: null },
  { local: 'Other nerve block', region: 'other', snomed: null },
];

export const REGIONAL_BLOCK_LABELS = REGIONAL_BLOCK_DEFS.map((d) => d.local);

export function regionalBlockToCoded(local: string): CodedValue | null {
  const def = REGIONAL_BLOCK_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.snomed) {
    return {
      system: CODE_SYSTEMS.snomed,
      code: def.snomed.code,
      display: def.snomed.display,
      mappings: [{ system: CODE_SYSTEMS.icmBlock, code: local, display: local }],
    };
  }
  return {
    system: CODE_SYSTEMS.icmBlock,
    code: local.replace(/\s+/g, '_').replace(/[()]/g, ''),
    display: local,
  };
}
