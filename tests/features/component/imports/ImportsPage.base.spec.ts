import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestHealthDb } from '$lib/core/db/test-client';
import { clearOwnerProfile } from '$lib/features/settings/service';
import { APPLE_HEALTH_XML, DAY_ONE_JSON } from '../../../support/fixtures/import-payloads';
import {
  getImportSourceSelect,
  getPreviewButton,
  renderImportsPage,
  selectImportSource,
  pasteImportPayload,
  getCommitButton,
} from './helpers/importsPageHarness';

describe('Imports route base flows', () => {
  beforeEach(async () => {
    clearOwnerProfile();
    await resetTestHealthDb();
  });

  it('renders the import shell and empty state', async () => {
    renderImportsPage();

    expect(screen.getByRole('heading', { name: 'Imports' })).toBeTruthy();
    await waitFor(() => {
      expect(getImportSourceSelect()).toBeTruthy();
      expect(screen.getByRole('option', { name: 'iPhone bundle / Shortcuts JSON' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'SMART sandbox FHIR JSON' })).toBeTruthy();
      expect(screen.getByText(/Apple Shortcuts/i)).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'Download template JSON' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/healthkit-companion-template.json');
      expect(
        screen.getByRole('link', { name: 'Open shortcut blueprint' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/shortcut-blueprint.md');
      expect(getPreviewButton()).toHaveProperty('disabled', true);
      expect(screen.getByText(/No import batches yet/i)).toBeTruthy();
    });
  });

  it('previews and commits a Day One import batch', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('day-one-json');
    await pasteImportPayload(DAY_ONE_JSON);
    await fireEvent.click(getPreviewButton());

    await waitFor(() => {
      expect(screen.getByText(/Adds: 1/i)).toBeTruthy();
    });

    await fireEvent.click(getCommitButton());
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByText(/day-one-json/i)).toBeTruthy();
    });
  });

  it('shows duplicate replay for Apple Health XML', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import payload');
    await selectImportSource('apple-health-xml');
    await pasteImportPayload(APPLE_HEALTH_XML);
    await fireEvent.click(getPreviewButton());
    await waitFor(() => {
      expect(screen.getByText(/Adds: 1/i)).toBeTruthy();
    });
    await fireEvent.click(getCommitButton());
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeTruthy();
    });

    await fireEvent.click(getPreviewButton());
    await waitFor(() => {
      expect(screen.getAllByText(/apple-health-xml/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Duplicates: 1/i)).toBeTruthy();
    });
  });
});
