import { z } from 'zod';

const symptomFormSchema = z.object({
  symptom: z.string(),
  severity: z.string(),
  note: z.string(),
});

const anxietyFormSchema = z.object({
  intensity: z.string(),
  trigger: z.string(),
  durationMinutes: z.string(),
  note: z.string(),
});

const sleepNoteFormSchema = z.object({
  note: z.string(),
  restfulness: z.string(),
  context: z.string(),
});

const templateFormSchema = z.object({
  label: z.string(),
  templateType: z.enum(['medication', 'supplement']),
  defaultDose: z.string(),
  defaultUnit: z.string(),
  note: z.string(),
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
