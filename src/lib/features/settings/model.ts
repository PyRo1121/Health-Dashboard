import type { OwnerProfile } from '$lib/core/domain/types';

export const settingsOwnerProfileDescription =
	'Single-user mode. SMART clinical imports only stage when the bundle patient matches this local owner identity.';

export const settingsLocalFirstPostureItems = [
	'Preview before commit',
	'Source-record dedupe on replay',
	'Timeline and Review remain the verification surfaces'
] as const;

export const ownerProfileSavedMessage =
	'Owner profile saved. SMART clinical imports now match against this identity.';

export const ownerProfileClearedMessage =
	'Owner profile cleared. Clinical imports stay blocked until you save it again.';

export function createOwnerProfileForm(profile: OwnerProfile | null): {
	fullName: string;
	birthDate: string;
} {
	return {
		fullName: profile?.fullName ?? '',
		birthDate: profile?.birthDate ?? ''
	};
}

export function canSaveOwnerProfileForm(fullName: string, birthDate: string): boolean {
	return fullName.trim().length > 0 && birthDate.trim().length > 0;
}
