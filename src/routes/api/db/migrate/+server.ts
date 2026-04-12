import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import {
  countMigratedRecords,
  importHealthDbSnapshot,
} from '$lib/server/db/drizzle/import-snapshot';

type MigrationRequest = {
  snapshot: HealthDbSnapshot & {
    plannedMeals?: unknown[];
  };
};

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as MigrationRequest;
  const { db } = getServerDrizzleClient();
  const { snapshot } = body;

  await importHealthDbSnapshot(db, snapshot);

  return json({
    migrated: countMigratedRecords(snapshot),
  });
};
