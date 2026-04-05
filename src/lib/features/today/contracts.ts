import { z } from 'zod';
import type { TodayPageState } from './controller';

function isTodayPageState(value: unknown): value is TodayPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const form = state.form as Record<string, unknown> | undefined;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.saving === 'boolean' &&
    typeof state.saveNotice === 'string' &&
    typeof state.todayDate === 'string' &&
    (state.snapshot === null || (typeof state.snapshot === 'object' && state.snapshot !== null)) &&
    form !== undefined &&
    typeof form.mood === 'string' &&
    typeof form.energy === 'string' &&
    typeof form.stress === 'string' &&
    typeof form.focus === 'string' &&
    typeof form.sleepHours === 'string' &&
    typeof form.sleepQuality === 'string' &&
    typeof form.freeformNote === 'string'
  );
}

const todayPageStateSchema = z.custom<TodayPageState>(isTodayPageState, {
  message: 'Invalid today page state',
});

export const todayRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
  }),
  z.object({
    action: z.literal('save'),
    state: todayPageStateSchema,
  }),
  z.object({
    action: z.literal('logPlannedMeal'),
    state: todayPageStateSchema,
  }),
  z.object({
    action: z.literal('clearPlannedMeal'),
    state: todayPageStateSchema,
  }),
  z.object({
    action: z.literal('markPlanSlotStatus'),
    state: todayPageStateSchema,
    slotId: z.string(),
    status: z.enum(['planned', 'done', 'skipped']),
  }),
]);

export type TodayRequest = z.infer<typeof todayRequestSchema>;
