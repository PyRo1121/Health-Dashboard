import { z } from 'zod';
import { normalizeSafeExternalUrl } from '$lib/core/shared/external-links';

function isFiniteNumberString(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function isBoundedNumberString(value: string, min: number, max: number): boolean {
  if (!isFiniteNumberString(value)) {
    return false;
  }

  const parsed = Number(value);
  return parsed >= min && parsed <= max;
}

const safeReferenceUrlSchema = z
  .string()
  .transform((value) => normalizeSafeExternalUrl(value) ?? '');

const scoreStringSchema = z
  .string()
  .refine((value) => isBoundedNumberString(value, 1, 5), 'Expected a score from 1 to 5');

const optionalNonNegativeNumberStringSchema = z
  .string()
  .refine(
    (value) => !value.trim() || (isFiniteNumberString(value) && Number(value) >= 0),
    'Expected a non-negative finite number or blank'
  );

const symptomFormSchema = z.object({
  symptom: z.string(),
  severity: scoreStringSchema,
  note: z.string(),
  referenceUrl: safeReferenceUrlSchema,
});

const anxietyFormSchema = z.object({
  intensity: scoreStringSchema,
  trigger: z.string(),
  durationMinutes: optionalNonNegativeNumberStringSchema,
  note: z.string(),
});

const sleepNoteFormSchema = z.object({
  note: z.string(),
  restfulness: z
    .string()
    .refine((value) => !value.trim() || isBoundedNumberString(value, 1, 5), 'Expected a score from 1 to 5 or blank'),
  context: z.string(),
});

const templateFormSchema = z.object({
  label: z.string(),
  templateType: z.enum(['medication', 'supplement']),
  defaultDose: optionalNonNegativeNumberStringSchema,
  defaultUnit: z.string(),
  note: z.string(),
  referenceUrl: safeReferenceUrlSchema,
});

export const healthMutationStateSchema = z.object({
  localDay: z.string(),
  symptomForm: symptomFormSchema,
  anxietyForm: anxietyFormSchema,
  sleepNoteForm: sleepNoteFormSchema,
  templateForm: templateFormSchema,
});

export type HealthMutationState = z.infer<typeof healthMutationStateSchema>;

export const healthRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('load'), localDay: z.string() }),
  z.object({ action: z.literal('saveSymptom'), state: healthMutationStateSchema }),
  z.object({ action: z.literal('saveAnxiety'), state: healthMutationStateSchema }),
  z.object({ action: z.literal('saveSleepNote'), state: healthMutationStateSchema }),
  z.object({ action: z.literal('saveTemplate'), state: healthMutationStateSchema }),
  z.object({
    action: z.literal('quickLogTemplate'),
    state: healthMutationStateSchema,
    templateId: z.string(),
  }),
]);
