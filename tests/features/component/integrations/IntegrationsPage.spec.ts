import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb, resetTestHealthDb } from '$lib/core/db/test-client';
import { commitImportBatch, previewImport } from '$lib/features/imports/store';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import IntegrationsPage from '../../../../src/routes/integrations/+page.svelte';

describe('Integrations route', () => {
  beforeEach(async () => {
    await resetTestHealthDb();
  });

  it('shows the HealthKit companion manifest and import handoff', async () => {
    render(IntegrationsPage);

    expect(screen.getByRole('heading', { name: 'Integrations' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/iPhone HealthKit Companion/i)).toBeTruthy();
      expect(screen.getAllByText(/Shortcut/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Download the Shortcut kit, run it on iPhone/i)).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'Download template JSON' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/healthkit-companion-template.json');
      expect(
        screen.getByRole('link', { name: 'Open shortcut blueprint' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/shortcut-blueprint.md');
      expect(screen.getByRole('link', { name: 'Open import center' }).getAttribute('href')).toBe(
        '/imports'
      );
      expect(
        screen.getByRole('table', { name: 'Clinical connector capability matrix' })
      ).toBeTruthy();
      expect(screen.getAllByText(/SMART on FHIR sandbox/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Identity gate required/i)).toBeTruthy();
    });
  });

  it('shows a connected summary after a native companion bundle is committed', async () => {
    const db = getTestHealthDb();
    await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    await commitImportBatch(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });

    render(IntegrationsPage);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeTruthy();
      expect(screen.getByText(/Imported native companion events: 3/i)).toBeTruthy();
      expect(screen.getByText(/Pyro iPhone/i)).toBeTruthy();
      expect(screen.getByText(/resting-heart-rate, sleep-duration, step-count/i)).toBeTruthy();
    });
  });
});
