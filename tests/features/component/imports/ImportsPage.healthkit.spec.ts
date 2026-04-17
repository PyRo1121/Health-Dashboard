import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestHealthDb } from '$lib/core/db/test-client';
import {
  HEALTHKIT_BUNDLE_JSON,
  INVALID_HEALTHKIT_BUNDLE_VERSION_JSON,
} from '../../../support/fixtures/healthkit-bundle';
import { clearOwnerProfile } from '$lib/features/settings/service';
import {
  dropImportFile,
  getCommitButton,
  getImportPayloadInput,
  getPreviewButton,
  renderImportsPage,
  selectImportSource,
  pasteImportPayload,
  uploadImportFile,
  waitForCompanionSummary,
} from './helpers/importsPageHarness';

describe('Imports route healthkit flows', () => {
  beforeEach(async () => {
    clearOwnerProfile();
    await resetTestHealthDb();
  });

  it('previews and commits a HealthKit companion bundle', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import payload');
    await selectImportSource('healthkit-companion');
    await pasteImportPayload(HEALTHKIT_BUNDLE_JSON);
    await fireEvent.click(getPreviewButton());

    await waitFor(() => {
      const previewSummary = screen.getByLabelText('Import payload summary');
      expect(previewSummary.textContent).toContain('3');
    });

    await fireEvent.click(getCommitButton());
    await waitFor(() => {
      expect(screen.getByText(/healthkit-companion/i)).toBeTruthy();
      const historySection = screen
        .getByRole('heading', { name: 'Import batch history' })
        .closest('section') as HTMLElement;
      expect(historySection.textContent).toContain('Adds: 3');
      expect(historySection.textContent).toContain('Duplicates: 0');
      expect(historySection.textContent).toContain('Warnings: 0');
      expect(historySection.textContent).toContain('Updated:');
    });
  });

  it('shows registry-backed trust and auth context for the HealthKit import lane', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('healthkit-companion');

    await waitFor(() => {
      expect(screen.getByText(/Trust: official/i)).toBeTruthy();
      expect(screen.getByText(/Auth: native-consent/i)).toBeTruthy();
    });
  });

  it('shows a pre-preview summary for valid pasted payloads', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('apple-health-xml');
    await pasteImportPayload(HEALTHKIT_BUNDLE_JSON);
    expect(getPreviewButton()).toHaveProperty('disabled', true);

    const summary = await waitForCompanionSummary();
    expect(summary.getByText(/Detected source: iPhone HealthKit Companion/i)).toBeTruthy();
  });

  it('loads a bundle from a file input and infers the source type', async () => {
    renderImportsPage();

    const file = new File([HEALTHKIT_BUNDLE_JSON], 'healthkit-bundle.json', {
      type: 'application/json',
    });

    await screen.findByLabelText('Import file');
    await uploadImportFile(file);

    const summary = await waitForCompanionSummary();
    expect(screen.getByText('healthkit-bundle.json', { exact: true })).toBeTruthy();
    expect(summary.getByText(/3 records/i)).toBeTruthy();
    expect(summary.getByText(/sleep-duration, step-count, resting-heart-rate/i)).toBeTruthy();
    expect(getImportPayloadInput().value).toContain('"connector": "healthkit-ios"');
  });

  it('loads a bundle from drag and drop and allows clearing the loaded file', async () => {
    renderImportsPage();

    const file = new File([HEALTHKIT_BUNDLE_JSON], 'shortcut-export.json', {
      type: 'application/json',
    });

    await screen.findByLabelText('Import drop zone');
    await dropImportFile(file);

    await waitForCompanionSummary();
    expect(screen.getByText(/^shortcut-export\.json$/i)).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Clear loaded file' }));

    await waitFor(() => {
      expect(getImportPayloadInput().value).toBe('');
      expect(screen.queryByLabelText('Import payload summary')).toBeNull();
    });
  });

  it('drops file-derived summary state when the payload is edited manually', async () => {
    renderImportsPage();

    const file = new File([HEALTHKIT_BUNDLE_JSON], 'healthkit-bundle.json', {
      type: 'application/json',
    });

    await screen.findByLabelText('Import file');
    await uploadImportFile(file);

    await waitFor(() => {
      expect(screen.getByLabelText('Import payload summary')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Clear loaded file' })).toBeTruthy();
    });

    await pasteImportPayload(`${HEALTHKIT_BUNDLE_JSON}\n `);

    await waitFor(() => {
      expect(screen.getByLabelText('Import payload summary')).toBeTruthy();
      expect(getImportPayloadInput().value).toContain('"connector": "healthkit-ios"');
      expect(screen.queryByText(/Adds: 3/i)).toBeNull();
    });
  });

  it('clears stale preview state when a pasted payload changes after preview', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import payload');
    await pasteImportPayload(HEALTHKIT_BUNDLE_JSON);
    await fireEvent.click(getPreviewButton());

    await waitFor(() => {
      expect(screen.getAllByText(/Adds: 3/i).length).toBeGreaterThan(0);
      expect(getCommitButton()).toHaveProperty('disabled', false);
    });

    await pasteImportPayload(`${HEALTHKIT_BUNDLE_JSON}\n`);

    await waitFor(() => {
      expect(screen.getAllByText(/Adds: 3/i).length).toBe(1);
      expect(getCommitButton()).toHaveProperty('disabled', true);
      expect(screen.getByLabelText('Import payload summary')).toBeTruthy();
    });
  });

  it('shows a validation error for an invalid companion bundle', async () => {
    renderImportsPage();

    const file = new File([INVALID_HEALTHKIT_BUNDLE_VERSION_JSON], 'bad-healthkit-bundle.json', {
      type: 'application/json',
    });

    await screen.findByLabelText('Import file');
    await uploadImportFile(file);
    await waitFor(() => {
      expect(screen.getByText(/Shortcut\/native bundle is invalid/i)).toBeTruthy();
      expect(screen.getByText(/connectorVersion/i)).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'Download template JSON' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/healthkit-companion-template.json');
      expect(
        screen.getByRole('link', { name: 'Open shortcut blueprint' }).getAttribute('href')
      ).toBe('/downloads/ios-shortcuts/shortcut-blueprint.md');
      expect(getPreviewButton()).toHaveProperty('disabled', true);
    });
  });

  it('shows an invalid summary when a broken companion bundle is pasted manually', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import payload');
    await pasteImportPayload(INVALID_HEALTHKIT_BUNDLE_VERSION_JSON);

    await waitFor(() => {
      expect(screen.getByLabelText('Import payload summary')).toBeTruthy();
      expect(screen.getByText(/Shortcut\/native bundle is invalid/i)).toBeTruthy();
      expect(getPreviewButton()).toHaveProperty('disabled', true);
    });
  });
});
