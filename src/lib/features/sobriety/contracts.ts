import { z } from 'zod';
import type { SobrietyPageState } from './controller';

function isSobrietyPageState(value: unknown): value is SobrietyPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const summary = state.summary;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.saveNotice === 'string' &&
    typeof state.cravingScore === 'string' &&
    typeof state.cravingNote === 'string' &&
    typeof state.lapseNote === 'string' &&
    typeof state.recoveryAction === 'string' &&
    !!summary &&
    typeof summary === 'object' &&
    typeof (summary as Record<string, unknown>).streak === 'number' &&
    Array.isArray((summary as Record<string, unknown>).todayEvents)
  );
}

const sobrietyPageStateSchema = z.custom<SobrietyPageState>(isSobrietyPageState, {
  message: 'Invalid sobriety page state',
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
