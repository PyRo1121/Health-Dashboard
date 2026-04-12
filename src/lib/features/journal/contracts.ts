import { z } from 'zod';
import type { JournalPageState } from './controller';
import type { JournalIntent } from './navigation';

function isJournalPageState(value: unknown): value is JournalPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const draft = state.draft;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.saving === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.saveNotice === 'string' &&
    Array.isArray(state.entries) &&
    Array.isArray(state.linkedContextRows) &&
    !!draft &&
    typeof draft === 'object' &&
    typeof (draft as Record<string, unknown>).localDay === 'string' &&
    typeof (draft as Record<string, unknown>).entryType === 'string' &&
    typeof (draft as Record<string, unknown>).title === 'string' &&
    typeof (draft as Record<string, unknown>).body === 'string' &&
    Array.isArray((draft as Record<string, unknown>).tags) &&
    Array.isArray((draft as Record<string, unknown>).linkedEventIds)
  );
}

function isJournalIntent(value: unknown): value is JournalIntent {
  if (!value || typeof value !== 'object') return false;
  const intent = value as Record<string, unknown>;

  return (
    (intent.source === 'today-recovery' || intent.source === 'review-context') &&
    typeof intent.localDay === 'string' &&
    typeof intent.entryType === 'string' &&
    typeof intent.title === 'string' &&
    typeof intent.body === 'string' &&
    Array.isArray(intent.linkedEventIds)
  );
}

const journalPageStateSchema = z.custom<JournalPageState>(isJournalPageState, {
  message: 'Invalid journal page state',
});

const journalIntentSchema = z.custom<JournalIntent>(isJournalIntent, {
  message: 'Invalid journal intent',
});

export const journalRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
    state: journalPageStateSchema,
  }),
  z.object({
    action: z.literal('hydrateIntent'),
    state: journalPageStateSchema,
    intent: journalIntentSchema,
  }),
  z.object({
    action: z.literal('save'),
    state: journalPageStateSchema,
  }),
  z.object({
    action: z.literal('delete'),
    state: journalPageStateSchema,
    id: z.string(),
  }),
]);
