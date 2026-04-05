import { describe, expect, it } from 'vitest';
import {
  canSaveOwnerProfileForm,
  createOwnerProfileForm,
  ownerProfileClearedMessage,
  ownerProfileSavedMessage,
  settingsLocalFirstPostureItems,
  settingsOwnerProfileDescription,
} from '$lib/features/settings/model';

describe('settings model', () => {
  it('hydrates the owner profile form and validates the save state', () => {
    expect(createOwnerProfileForm(null)).toEqual({ fullName: '', birthDate: '' });
    expect(
      createOwnerProfileForm({
        fullName: 'Pyro Example',
        birthDate: '1990-01-01',
      })
    ).toEqual({
      fullName: 'Pyro Example',
      birthDate: '1990-01-01',
    });
    expect(canSaveOwnerProfileForm('', '1990-01-01')).toBe(false);
    expect(canSaveOwnerProfileForm('Pyro Example', '1990-01-01')).toBe(true);
    expect(settingsOwnerProfileDescription).toMatch(/SMART clinical imports/i);
    expect(settingsLocalFirstPostureItems).toEqual([
      'Preview before commit',
      'Source-record dedupe on replay',
      'Timeline and Review remain the verification surfaces',
    ]);
    expect(ownerProfileSavedMessage).toMatch(/saved/i);
    expect(ownerProfileClearedMessage).toMatch(/cleared/i);
  });
});
