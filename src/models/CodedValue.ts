import { z } from 'zod';

// A single terminology-bound value: { system, code, display }. Used for every
// categorical field that participates in the semantic export (diagnosis,
// organ system, procedure type, supervision level, etc.). Mirrors the shape
// of HL7 FHIR's `Coding` datatype so FHIR serialisation is direct.

export const CodedValueSchema = z.object({
  system: z.string().url(),
  code: z.string().min(1),
  display: z.string().min(1),
  // Optional: a second coding of the same concept in another system (e.g. the
  // SNOMED equivalent of an ICD-10 code). Kept flat to stay FHIR-compatible.
  mappings: z
    .array(
      z.object({
        system: z.string().url(),
        code: z.string().min(1),
        display: z.string().min(1),
      })
    )
    .optional(),
});

export type CodedValue = z.infer<typeof CodedValueSchema>;
