import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { OwnerProfile } from '$lib/core/domain/types';

const OWNER_PROFILE_PATH = join(process.cwd(), '.data', 'owner-profile.json');

function normalizeOwnerProfile(profile: OwnerProfile): OwnerProfile {
  return {
    fullName: profile.fullName.trim().replace(/\s+/g, ' '),
    birthDate: profile.birthDate.trim(),
  };
}

export async function getServerOwnerProfile(): Promise<OwnerProfile | null> {
  try {
    const raw = await readFile(OWNER_PROFILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<OwnerProfile>;
    if (typeof parsed.fullName !== 'string' || typeof parsed.birthDate !== 'string') {
      return null;
    }

    return normalizeOwnerProfile({
      fullName: parsed.fullName,
      birthDate: parsed.birthDate,
    });
  } catch {
    return null;
  }
}

export async function saveServerOwnerProfile(profile: OwnerProfile): Promise<OwnerProfile> {
  const normalized = normalizeOwnerProfile(profile);
  await mkdir(dirname(OWNER_PROFILE_PATH), { recursive: true });
  await writeFile(OWNER_PROFILE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export async function clearServerOwnerProfile(): Promise<void> {
  await rm(OWNER_PROFILE_PATH, { force: true });
}
