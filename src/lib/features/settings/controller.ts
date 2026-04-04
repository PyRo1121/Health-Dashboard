import type { OwnerProfile } from '$lib/core/domain/types';
import {
	createOwnerProfileForm,
	ownerProfileClearedMessage,
	ownerProfileSavedMessage
} from './model';
import {
	clearOwnerProfile,
	getOwnerProfile,
	saveOwnerProfile
} from '$lib/features/settings/service';

export interface SettingsPageState {
	fullName: string;
	birthDate: string;
	statusMessage: string;
}

function buildSettingsPageState(
	profile: Pick<OwnerProfile, 'fullName' | 'birthDate'> | null = null,
	statusMessage = ''
): SettingsPageState {
	return {
		...createOwnerProfileForm(profile),
		statusMessage
	};
}

export function createSettingsPageState(): SettingsPageState {
	return buildSettingsPageState();
}

export function loadSettingsPage(): SettingsPageState {
	return buildSettingsPageState(getOwnerProfile());
}

export function saveSettingsPage(
	state: Pick<OwnerProfile, 'fullName' | 'birthDate'>
): SettingsPageState {
	const saved = saveOwnerProfile(state);
	return buildSettingsPageState(saved, ownerProfileSavedMessage);
}

export function clearSettingsPage(): SettingsPageState {
	clearOwnerProfile();
	return buildSettingsPageState(null, ownerProfileClearedMessage);
}
