import { z } from 'zod';

const sobrietyEventSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  localDay: z.string(),
  eventType: z.enum(['status', 'craving', 'lapse', 'recovery']),
  status: z.enum(['sober', 'lapse', 'recovery']).optional(),
  cravingScore: z.number().optional(),
  triggerTags: z.array(z.string()).optional(),
  recoveryAction: z.string().optional(),
  note: z.string().optional(),
});

const sobrietyPageStateSchema = z.object({
  loading: z.boolean(),
  localDay: z.string(),
  summary: z.object({
    streak: z.number(),
    todayEvents: z.array(sobrietyEventSchema),
  }),
  saveNotice: z.string(),
  cravingScore: z.string().regex(/^[0-5]$/),
  cravingNote: z.string(),
  lapseNote: z.string(),
  recoveryAction: z.string(),
});

export const sobrietyRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
    state: sobrietyPageStateSchema,
  }),
  z.object({
    action: z.literal('markStatus'),
    state: sobrietyPageStateSchema,
    status: z.enum(['sober', 'recovery']),
    notice: z.string(),
  }),
  z.object({
    action: z.literal('saveCraving'),
    state: sobrietyPageStateSchema,
  }),
  z.object({
    action: z.literal('saveLapse'),
    state: sobrietyPageStateSchema,
  }),
]);
