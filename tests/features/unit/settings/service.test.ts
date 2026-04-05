import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOwnerProfile,
  getOwnerProfile,
  saveOwnerProfile,
} from '$lib/features/settings/service';

describe('settings service', () => {
  beforeEach(() => {
    clearOwnerProfile();
  });

  it('saves and reloads the single-owner profile used by clinical imports', () => {
    saveOwnerProfile({
      fullName: 'Pyro Example',
      birthDate: '1990-01-01',
    });

    expect(getOwnerProfile()).toEqual({
      fullName: 'Pyro Example',
      birthDate: '1990-01-01',
    });
  });

  it('clears the owner profile when requested', () => {
    saveOwnerProfile({
      fullName: 'Pyro Example',
      birthDate: '1990-01-01',
    });
    clearOwnerProfile();

    expect(getOwnerProfile()).toBeNull();
  });
});
