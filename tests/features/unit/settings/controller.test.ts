import { describe, expect, it } from 'vitest';
import {
	clearSettingsPage,
	createSettingsPageState,
	loadSettingsPage,
	saveSettingsPage
} from '$lib/features/settings/controller';
import { clearOwnerProfile } from '$lib/features/settings/service';

describe('settings controller', () => {
	it('loads, saves, and clears settings controller state', () => {
		clearOwnerProfile();
		let state = createSettingsPageState();
		expect(state).toEqual({ fullName: '', birthDate: '', statusMessage: '' });

		state = saveSettingsPage({
			fullName: 'Pyro Example',
			birthDate: '1990-01-01'
		});
		expect(state.statusMessage).toMatch(/saved/i);

		state = loadSettingsPage();
		expect(state.fullName).toBe('Pyro Example');
		expect(state.birthDate).toBe('1990-01-01');

		state = clearSettingsPage();
		expect(state).toEqual({
			fullName: '',
			birthDate: '',
			statusMessage: expect.stringMatching(/cleared/i)
		});
	});
});
