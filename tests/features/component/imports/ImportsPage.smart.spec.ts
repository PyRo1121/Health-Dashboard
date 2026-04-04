import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetHealthDb } from '$lib/core/db/client';
import { SMART_FHIR_BUNDLE_JSON } from '../../../support/fixtures/smart-fhir-bundle';
import { clearOwnerProfile, saveOwnerProfile } from '$lib/features/settings/service';
import {
	getCommitButton,
	getPreviewButton,
	renderImportsPage,
	selectImportSource,
	pasteImportPayload
} from './helpers/importsPageHarness';

describe('Imports route SMART clinical flows', () => {
	beforeEach(async () => {
		clearOwnerProfile();
		await resetHealthDb();
	});

	it('blocks SMART sandbox preview until the owner profile is configured', async () => {
		renderImportsPage();

		await screen.findByLabelText('Import source');
		await selectImportSource('smart-fhir-sandbox');
		expect(screen.getByRole('link', { name: 'Open Settings' }).getAttribute('href')).toBe('/settings');
		await pasteImportPayload(SMART_FHIR_BUNDLE_JSON);
		await fireEvent.click(getPreviewButton());

		await waitFor(() => {
			expect(
				screen.getByText(/Configure your owner profile in Settings before previewing SMART clinical imports\./i)
			).toBeTruthy();
			expect(getCommitButton()).toHaveProperty('disabled', true);
		});
	});

	it('previews and commits a SMART sandbox bundle when the owner profile matches', async () => {
		saveOwnerProfile({
			fullName: 'Pyro Example',
			birthDate: '1990-01-01'
		});

		renderImportsPage();

		await screen.findByLabelText('Import source');
		await selectImportSource('smart-fhir-sandbox');
		await pasteImportPayload(SMART_FHIR_BUNDLE_JSON);
		await fireEvent.click(getPreviewButton());

		await waitFor(() => {
			expect(screen.getByText(/Adds: 3/i)).toBeTruthy();
		});

		await fireEvent.click(getCommitButton());
		await waitFor(() => {
			expect(screen.getByText(/smart-fhir-sandbox/i)).toBeTruthy();
		});
	});
});
