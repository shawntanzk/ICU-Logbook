import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Arterial line insertion site catalogue.
// UBERON codes for anatomical sites; SNOMED for the procedure concept.

export interface ArterialLineSiteDef {
  local: string;
  side?: 'left' | 'right' | 'bilateral' | null;
  uberon: { code: string; display: string } | null;
}

export const ARTERIAL_LINE_SITE_DEFS: ArterialLineSiteDef[] = [
  { local: 'Radial — Left',        side: 'left',  uberon: { code: 'UBERON_0001346', display: 'radial artery' } },
  { local: 'Radial — Right',       side: 'right', uberon: { code: 'UBERON_0001346', display: 'radial artery' } },
  { local: 'Femoral — Left',       side: 'left',  uberon: { code: 'UBERON_0001312', display: 'femoral artery' } },
  { local: 'Femoral — Right',      side: 'right', uberon: { code: 'UBERON_0001312', display: 'femoral artery' } },
  { local: 'Brachial — Left',      side: 'left',  uberon: { code: 'UBERON_0001314', display: 'brachial artery' } },
  { local: 'Brachial — Right',     side: 'right', uberon: { code: 'UBERON_0001314', display: 'brachial artery' } },
  { local: 'Axillary — Left',      side: 'left',  uberon: { code: 'UBERON_0001308', display: 'axillary artery' } },
  { local: 'Axillary — Right',     side: 'right', uberon: { code: 'UBERON_0001308', display: 'axillary artery' } },
  { local: 'Dorsalis Pedis — Left', side: 'left', uberon: { code: 'UBERON_0001411', display: 'dorsalis pedis artery' } },
  { local: 'Dorsalis Pedis — Right', side: 'right', uberon: { code: 'UBERON_0001411', display: 'dorsalis pedis artery' } },
  { local: 'Ulnar — Left',         side: 'left',  uberon: { code: 'UBERON_0001349', display: 'ulnar artery' } },
  { local: 'Ulnar — Right',        side: 'right', uberon: { code: 'UBERON_0001349', display: 'ulnar artery' } },
  { local: 'Other',                 side: null,    uberon: null },
];

export const ARTERIAL_LINE_SITE_LABELS = ARTERIAL_LINE_SITE_DEFS.map((d) => d.local);

export function arterialLineSiteToCoded(local: string): CodedValue | null {
  const def = ARTERIAL_LINE_SITE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.uberon) {
    // Build a PURL for the UBERON term.
    const purl = `http://purl.obolibrary.org/obo/${def.uberon.code}`;
    return {
      system: CODE_SYSTEMS.uberon,
      code: purl,
      display: def.uberon.display,
      mappings: [
        {
          system: CODE_SYSTEMS.snomed,
          code: '392247006', // Insertion of arterial catheter
          display: `Arterial catheter — ${def.uberon.display}`,
        },
      ],
    };
  }
  return { system: CODE_SYSTEMS.iculogbook, code: 'arterial-line/other', display: 'Other arterial site' };
}
