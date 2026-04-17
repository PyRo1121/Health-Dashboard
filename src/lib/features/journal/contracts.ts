import { z } from 'zod';
import { journalEntryTypes } from '$lib/core/domain/types';

const journalDraftSchema = z.object({
  id: z.string().optional(),
  localDay: z.string(),
  entryType: z.enum(journalEntryTypes),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  linkedEventIds: z.array(z.string()),
});

const journalEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  localDay: z.string(),
  entryType: z.enum(journalEntryTypes),
  title: z.string().optional(),
  body: z.string(),
  tags: z.array(z.string()),
  linkedEventIds: z.array(z.string()),
});

const journalLinkedContextRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  valueLabel: z.string(),
  sourceLabel: z.string(),
  selected: z.boolean(),
});

const journalPageStateSchema = z.object({
  loading: z.boolean(),
  saving: z.boolean(),
  localDay: z.string(),
  saveNotice: z.string(),
  entries: z.array(journalEntrySchema),
  draft: journalDraftSchema,
  linkedContextRows: z.array(journalLinkedContextRowSchema),
});

const journalIntentSchema = z.object({
  source: z.enum(['today-recovery', 'review-context']),
  localDay: z.string(),
  entryType: z.enum(journalEntryTypes),
  title: z.string(),
  body: z.string(),
  linkedEventIds: z.array(z.string()),
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
