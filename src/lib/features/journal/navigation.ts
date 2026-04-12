import type { JournalEntry } from '$lib/core/domain/types';

export interface JournalIntent {
  source: 'today-recovery' | 'review-context';
  localDay: string;
  entryType: JournalEntry['entryType'];
  title: string;
  body: string;
  linkedEventIds: string[];
}

export type JournalIntentHref = `/journal?intentId=${string}`;

const JOURNAL_INTENT_STORAGE_PREFIX = 'health:journal-intent:';
const journalIntentMemory = new Map<string, JournalIntent>();

function createJournalIntentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `intent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function persistJournalIntent(id: string, intent: JournalIntent): void {
  journalIntentMemory.set(id, intent);

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(`${JOURNAL_INTENT_STORAGE_PREFIX}${id}`, JSON.stringify(intent));
}

function consumeStoredJournalIntent(id: string): JournalIntent | null {
  const memoryIntent = journalIntentMemory.get(id) ?? null;
  journalIntentMemory.delete(id);

  if (typeof sessionStorage === 'undefined') {
    return memoryIntent;
  }

  const storageKey = `${JOURNAL_INTENT_STORAGE_PREFIX}${id}`;
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) {
    return memoryIntent;
  }

  sessionStorage.removeItem(storageKey);

  try {
    return JSON.parse(raw) as JournalIntent;
  } catch {
    return memoryIntent;
  }
}

export function buildStoredJournalIntentHref(intent: JournalIntent): JournalIntentHref {
  const intentId = createJournalIntentId();
  persistJournalIntent(intentId, intent);
  return `/journal?intentId=${encodeURIComponent(intentId)}` as JournalIntentHref;
}

export function readJournalIntentFromSearch(search: string): JournalIntent | null {
  const params = new URLSearchParams(search);
  const intentId = params.get('intentId')?.trim();
  if (!intentId) {
    return null;
  }

  return consumeStoredJournalIntent(intentId);
}

export function clearJournalIntentFromLocation(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState' | 'state'>
): void {
  const params = new URLSearchParams(location.search);
  params.delete('intentId');

  const nextSearch = params.toString();
  const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash ?? ''}`;

  history.replaceState(history.state, '', nextUrl);
}
