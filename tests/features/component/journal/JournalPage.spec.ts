import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb } from '$lib/core/db/test-client';
import { currentLocalDay } from '$lib/core/domain/time';
import JournalPage from '../../../../src/routes/journal/+page.svelte';
import { buildStoredJournalIntentHref } from '$lib/features/journal/navigation';
import { expectHeading, resetRouteDb, waitForText } from '../../../support/component/routeHarness';

describe('Journal route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders the writing surface and empty state', async () => {
    render(JournalPage);

    expectHeading('Journal');
    await waitForText(/Nothing written yet today/i);
  });

  it('creates a journal entry and lists it', async () => {
    render(JournalPage);

    await screen.findByLabelText('Title');
    await fireEvent.input(screen.getByLabelText('Title'), {
      target: { value: 'Morning check-in' },
    });
    await fireEvent.input(screen.getByLabelText('Body'), {
      target: { value: 'Woke up steady and ready to work.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => {
      expect(screen.getByText('Morning check-in')).toBeTruthy();
      expect(screen.getByText(/steady and ready to work/i)).toBeTruthy();
    });
  });

  it('hydrates the journal draft from a query intent and clears the url params', async () => {
    const href = buildStoredJournalIntentHref({
      source: 'today-recovery',
      localDay: '2026-04-05',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });

    window.history.replaceState({}, '', href);

    render(JournalPage);
    expectHeading('Journal');

    await waitFor(() => {
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Recovery note');
      expect((screen.getByLabelText('Body') as HTMLTextAreaElement).value).toBe(
        'Crowded store and headache drained the afternoon.'
      );
      expect(screen.getByText(/Loaded from today recovery\./i)).toBeTruthy();
      expect(screen.getByText(/Linked context: 2 events\./i)).toBeTruthy();
    });

    expect(window.location.search).toBe('');
  });

  it('lets the user link a same-day signal before saving the entry', async () => {
    const db = getTestHealthDb();
    const today = currentLocalDay();
    const todayISO = `${today}T09:00:00.000Z`;
    await db.healthEvents.put({
      id: 'symptom-1',
      createdAt: todayISO,
      updatedAt: todayISO,
      sourceType: 'manual',
      sourceApp: 'personal-health-cockpit',
      sourceRecordId: 'symptom:1',
      sourceTimestamp: todayISO,
      localDay: today,
      timezone: 'UTC',
      confidence: 1,
      eventType: 'symptom',
      value: 4,
      payload: {
        kind: 'symptom',
        symptom: 'Headache',
        severity: 4,
      },
    });

    render(JournalPage);
    expectHeading('Journal');

    await waitFor(() => {
      expect(screen.getByText('Available context')).toBeTruthy();
      expect(screen.getByText('Symptom')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Link signal Symptom' }));
    await waitFor(() => {
      expect(screen.getByText(/Linked context: 1 events\./i)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Remove signal Symptom' })).toBeTruthy();
    });

    await fireEvent.input(screen.getByLabelText('Body'), {
      target: { value: 'Headache tracked after lunch.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => {
      expect(screen.getByText(/Entry saved\./i)).toBeTruthy();
      expect(screen.getByText(/1 linked signal/i)).toBeTruthy();
    });
  });
});
