import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestHealthDb } from '$lib/core/db/test-client';
import { SMART_FHIR_BUNDLE_JSON } from '../../../support/fixtures/smart-fhir-bundle';
import { clearOwnerProfile, saveOwnerProfile } from '$lib/features/settings/service';
import {
  getCommitButton,
  getPreviewButton,
  renderImportsPage,
  selectImportSource,
  pasteImportPayload,
} from './helpers/importsPageHarness';

describe('Imports route SMART clinical flows', () => {
  beforeEach(async () => {
    clearOwnerProfile();
    await resetTestHealthDb();
  });

  it('blocks SMART sandbox preview until the owner profile is configured', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('smart-fhir-sandbox');
    expect(screen.getByRole('link', { name: 'Open Settings' }).getAttribute('href')).toBe(
      '/settings'
    );
    await pasteImportPayload(SMART_FHIR_BUNDLE_JSON);
    await fireEvent.click(getPreviewButton());

    await waitFor(() => {
      expect(
        screen.getByText(
          /Configure your owner profile in Settings before previewing SMART clinical imports\./i
        )
      ).toBeTruthy();
      expect(getCommitButton()).toHaveProperty('disabled', true);
    });
  });

  it('previews and commits a SMART sandbox bundle when the owner profile matches', async () => {
    saveOwnerProfile({
      fullName: 'Pyro Example',
      birthDate: '1990-01-01',
    });

    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('smart-fhir-sandbox');
    await pasteImportPayload(SMART_FHIR_BUNDLE_JSON);
    await fireEvent.click(getPreviewButton());

    await waitFor(() => {
      const previewSummary = screen.getByLabelText('Import payload summary');
      expect(previewSummary.textContent).toContain('3');
    });

    await fireEvent.click(getCommitButton());
    await waitFor(() => {
      expect(screen.getByText(/smart-fhir-sandbox/i)).toBeTruthy();
    });
  });

  it('shows registry-backed trust and auth context for the SMART sandbox lane', async () => {
    renderImportsPage();

    await screen.findByLabelText('Import source');
    await selectImportSource('smart-fhir-sandbox');

    await waitFor(() => {
      expect(screen.getByText(/Trust: sandbox/i)).toBeTruthy();
      expect(screen.getByText(/Auth: oauth2/i)).toBeTruthy();
    });
  });
});
