import { browser } from '$app/environment';
import type { OwnerProfile } from '$lib/core/domain/types';

const OWNER_PROFILE_KEY = 'personal-health-cockpit:owner-profile';

let memoryOwnerProfile: OwnerProfile | null = null;

interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem?(key: string): void;
}

function getStorage(): StorageLike | null {
  if (!browser || typeof window === 'undefined') return null;

  return window.localStorage as StorageLike;
}

function normalizeOwnerProfile(profile: OwnerProfile): OwnerProfile {
  return {
    fullName: profile.fullName.trim().replace(/\s+/g, ' '),
    birthDate: profile.birthDate.trim(),
  };
}

function readStoredOwnerProfile(): OwnerProfile | null {
  const storage = getStorage();
  if (!storage) return memoryOwnerProfile;

  try {
    const raw = storage.getItem?.(OWNER_PROFILE_KEY) ?? null;
    if (!raw) return memoryOwnerProfile;

    const parsed = JSON.parse(raw) as Partial<OwnerProfile>;
    if (typeof parsed.fullName !== 'string' || typeof parsed.birthDate !== 'string') {
      return memoryOwnerProfile;
    }

    memoryOwnerProfile = normalizeOwnerProfile({
      fullName: parsed.fullName,
      birthDate: parsed.birthDate,
    });
    return memoryOwnerProfile;
  } catch {
    return memoryOwnerProfile;
  }
}

export function getOwnerProfile(): OwnerProfile | null {
  return readStoredOwnerProfile();
}

export function saveOwnerProfile(profile: OwnerProfile): OwnerProfile {
  const normalized = normalizeOwnerProfile(profile);
  memoryOwnerProfile = normalized;

  getStorage()?.setItem?.(OWNER_PROFILE_KEY, JSON.stringify(normalized));

  return normalized;
}

export function clearOwnerProfile(): void {
  memoryOwnerProfile = null;

  getStorage()?.removeItem?.(OWNER_PROFILE_KEY);
}
