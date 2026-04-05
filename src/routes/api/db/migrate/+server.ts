import { json } from '@sveltejs/kit';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { getServerHealthDb } from '$lib/server/db/client';

type MigrationRequest = {
  snapshot: HealthDbSnapshot;
};

export async function POST({ request }) {
  const body = (await request.json()) as MigrationRequest;
  const db = getServerHealthDb();
  const { snapshot } = body;

  await db.dailyRecords.bulkAdd(snapshot.dailyRecords);
  await db.journalEntries.bulkAdd(snapshot.journalEntries);
  await db.foodEntries.bulkAdd(snapshot.foodEntries);
  await db.foodCatalogItems.bulkAdd(snapshot.foodCatalogItems);
  await db.recipeCatalogItems.bulkAdd(snapshot.recipeCatalogItems);
  await db.plannedMeals.bulkAdd(snapshot.plannedMeals ?? []);
  await db.weeklyPlans.bulkAdd(snapshot.weeklyPlans ?? []);
  await db.planSlots.bulkAdd(snapshot.planSlots ?? []);
  await db.groceryItems.bulkAdd(snapshot.groceryItems ?? []);
  await db.workoutTemplates.bulkAdd(snapshot.workoutTemplates ?? []);
  await db.exerciseCatalogItems.bulkAdd(snapshot.exerciseCatalogItems ?? []);
  await db.favoriteMeals.bulkAdd(snapshot.favoriteMeals);
  await db.healthEvents.bulkAdd(snapshot.healthEvents);
  await db.healthTemplates.bulkAdd(snapshot.healthTemplates);
  await db.sobrietyEvents.bulkAdd(snapshot.sobrietyEvents);
  await db.assessmentResults.bulkAdd(snapshot.assessmentResults);
  await db.importBatches.bulkAdd(snapshot.importBatches);
  await db.importArtifacts.bulkAdd(snapshot.importArtifacts);
  await db.reviewSnapshots.bulkAdd(snapshot.reviewSnapshots);
  await db.adherenceMatches.bulkAdd(snapshot.adherenceMatches ?? []);

  return json({
    migrated: Object.values(snapshot).reduce((count, records) => count + records.length, 0),
  });
}
