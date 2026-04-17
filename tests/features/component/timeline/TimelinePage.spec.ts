import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb } from '$lib/core/db/test-client';
import TimelinePage from '../../../../src/routes/timeline/+page.svelte';
import { expectHeading, resetRouteDb } from '../../../support/component/routeHarness';
import { seedHealthkitImport } from '../../../support/component/routeSeeds';

describe('Timeline route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('shows imported native companion events with provenance', async () => {
    await seedHealthkitImport();

    render(TimelinePage);
    expectHeading('Timeline');

    await waitFor(() => {
      expect(screen.getByText(/Resting heart rate/i)).toBeTruthy();
      expect(screen.getAllByText(/HealthKit Companion · Pyro iPhone/i)).toHaveLength(3);
      expect(screen.getByText(/57 bpm/i)).toBeTruthy();
    });
  });

  it('does not render unsafe timeline reference links', async () => {
    const db = getTestHealthDb();
    await db.healthEvents.put({
      id: 'timeline-unsafe-link',
      createdAt: '2026-04-17T09:10:00Z',
      updatedAt: '2026-04-17T09:10:00Z',
      sourceType: 'manual',
      sourceApp: 'Personal Health Cockpit',
      localDay: '2026-04-17',
      confidence: 1,
      eventType: 'symptom',
      value: 4,
      payload: {
        kind: 'symptom',
        symptom: 'Headache',
        severity: 4,
        referenceUrl: 'javascript:alert(1)',
      },
    });

    render(TimelinePage);
    expectHeading('Timeline');

    await waitFor(() => {
      expect(screen.getByText(/Symptom/i)).toBeTruthy();
    });
    expect(
      screen.queryByRole('link', { name: 'Learn more about timeline event Symptom' })
    ).toBeNull();
  });
});
