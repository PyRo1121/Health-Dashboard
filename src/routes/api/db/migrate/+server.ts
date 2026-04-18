import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import {
  countMigratedRecords,
  importHealthDbSnapshot,
} from '$lib/server/db/drizzle/import-snapshot';
import { requireControlPlaneToken } from '$lib/server/http/control-plane-guard';

const INVALID_MIGRATION_REQUEST_MESSAGE = 'Invalid migration request payload.';
const MAX_MIGRATION_REQUEST_BYTES = 5_000_000;
const SNAPSHOT_KEYS = [
  'dailyRecords',
  'journalEntries',
  'foodEntries',
  'foodCatalogItems',
  'recipeCatalogItems',
  'weeklyPlans',
  'planSlots',
  'derivedGroceryItems',
  'manualGroceryItems',
  'workoutTemplates',
  'exerciseCatalogItems',
  'favoriteMeals',
  'healthEvents',
  'healthTemplates',
  'sobrietyEvents',
  'assessmentResults',
  'importBatches',
  'importArtifacts',
  'reviewSnapshots',
  'adherenceMatches',
] as const satisfies ReadonlyArray<keyof HealthDbSnapshot>;

type MigrationSnapshot = HealthDbSnapshot & {
  plannedMeals?: unknown[];
};

type MigrationRequest = {
  snapshot: MigrationSnapshot;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMigrationSnapshot(value: unknown): value is MigrationSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  for (const key of SNAPSHOT_KEYS) {
    if (!Array.isArray(value[key])) {
      return false;
    }
  }

  return value.plannedMeals === undefined || Array.isArray(value.plannedMeals);
}

function parseMigrationRequest(value: unknown): MigrationRequest | null {
  if (!isRecord(value) || !isMigrationSnapshot(value.snapshot)) {
    return null;
  }

  return {
    snapshot: value.snapshot,
  };
}

export const POST: RequestHandler = async ({ request }) => {
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_MIGRATION_REQUEST_BYTES) {
    return new Response('Migration request payload is too large.', { status: 413 });
  }

  const authResponse = requireControlPlaneToken(request, {
    envVar: 'HEALTH_CONTROL_PLANE_TOKEN',
    headerName: 'x-health-control-token',
  });
  if (authResponse) {
    return authResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(INVALID_MIGRATION_REQUEST_MESSAGE, { status: 400 });
  }

  const parsed = parseMigrationRequest(body);
  if (!parsed) {
    return new Response(INVALID_MIGRATION_REQUEST_MESSAGE, { status: 400 });
  }

  const { db } = getServerDrizzleClient();
  const { snapshot } = parsed;

  await importHealthDbSnapshot(db, snapshot);

  return json({
    migrated: countMigratedRecords(snapshot),
  });
};
