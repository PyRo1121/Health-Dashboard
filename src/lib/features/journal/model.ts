import type { JournalEntry } from '$lib/core/domain/types';
import type { JournalDraft } from '$lib/features/journal/service';

export const journalEntryTypeOptions = [
  { value: 'freeform', label: 'Freeform' },
  { value: 'morning_intention', label: 'Morning intention' },
  { value: 'evening_review', label: 'Evening review' },
  { value: 'craving_reflection', label: 'Craving reflection' },
  { value: 'symptom_note', label: 'Symptom note' },
  { value: 'experiment_note', label: 'Experiment note' },
] as const;

export type JournalEntryRow = {
  id: string;
  title: string;
  body: string;
};

export function createEmptyJournalDraft(localDay: string): JournalDraft {
  return {
    localDay,
    entryType: 'freeform',
    title: '',
    body: '',
    tags: [],
    linkedEventIds: [],
  };
}

export function normalizeJournalDraft(draft: JournalDraft, localDay: string): JournalDraft {
  return {
    ...draft,
    localDay,
    title: draft.title?.trim(),
    body: draft.body.trim(),
    tags: [...draft.tags],
    linkedEventIds: [...draft.linkedEventIds],
  };
}

export function createJournalEntryRows(entries: JournalEntry[]): JournalEntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title || 'Untitled entry',
    body: entry.body,
  }));
}
