import { CODE_SYSTEMS } from './codeSystems';
import type { CodedValue } from '../models/CodedValue';

// Central venous catheter insertion site catalogue.
// UBERON codes for anatomical sites.

export interface CVCSiteDef {
  local: string;
  side?: 'left' | 'right' | null;
  uberon: { code: string; display: string } | null;
}

export const CVC_SITE_DEFS: CVCSiteDef[] = [
  { local: 'Internal Jugular — Left',      side: 'left',  uberon: { code: 'UBERON_0001585', display: 'internal jugular vein' } },
  { local: 'Internal Jugular — Right',     side: 'right', uberon: { code: 'UBERON_0001585', display: 'internal jugular vein' } },
  { local: 'Subclavian — Left',            side: 'left',  uberon: { code: 'UBERON_0001582', display: 'subclavian vein' } },
  { local: 'Subclavian — Right',           side: 'right', uberon: { code: 'UBERON_0001582', display: 'subclavian vein' } },
  { local: 'Femoral — Left',               side: 'left',  uberon: { code: 'UBERON_0001331', display: 'femoral vein' } },
  { local: 'Femoral — Right',              side: 'right', uberon: { code: 'UBERON_0001331', display: 'femoral vein' } },
  { local: 'Axillary — Left',              side: 'left',  uberon: { code: 'UBERON_0001593', display: 'axillary vein' } },
  { local: 'Axillary — Right',             side: 'right', uberon: { code: 'UBERON_0001593', display: 'axillary vein' } },
  { local: 'External Jugular — Left',      side: 'left',  uberon: { code: 'UBERON_0001586', display: 'external jugular vein' } },
  { local: 'External Jugular — Right',     side: 'right', uberon: { code: 'UBERON_0001586', display: 'external jugular vein' } },
  { local: 'Other',                         side: null,    uberon: null },
];

export const CVC_SITE_LABELS = CVC_SITE_DEFS.map((d) => d.local);

export function cvcSiteToCoded(local: string): CodedValue | null {
  const def = CVC_SITE_DEFS.find((d) => d.local === local);
  if (!def) return null;
  if (def.uberon) {
    const purl = `http://purl.obolibrary.org/obo/${def.uberon.code}`;
    return {
      system: CODE_SYSTEMS.uberon,
      code: purl,
      display: def.uberon.display,
      mappings: [
        {
          system: CODE_SYSTEMS.snomed,
          code: '233547005', // Insertion of central venous catheter
          display: `CVC — ${def.uberon.display}`,
        },
      ],
    };
  }
  return { system: CODE_SYSTEMS.iculogbook, code: 'cvc/other', display: 'Other CVC site' };
}
