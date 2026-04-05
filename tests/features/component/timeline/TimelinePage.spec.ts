import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
