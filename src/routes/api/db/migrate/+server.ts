import { json } from '@sveltejs/kit';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { getServerHealthDb } from '$lib/server/db/client';

type MigrationRequest = {
  snapshot: HealthDbSnapshot & {
    plannedMeals?: unknown[];
  };
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
  await db.weeklyPlans.bulkAdd(snapshot.weeklyPlans ?? []);
  await db.planSlots.bulkAdd(snapshot.planSlots ?? []);
  await db.derivedGroceryItems.bulkAdd(snapshot.derivedGroceryItems ?? []);
  await db.manualGroceryItems.bulkAdd(snapshot.manualGroceryItems ?? []);
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
    migrated:
      snapshot.dailyRecords.length +
      snapshot.journalEntries.length +
      snapshot.foodEntries.length +
      snapshot.foodCatalogItems.length +
      snapshot.recipeCatalogItems.length +
      snapshot.weeklyPlans.length +
      snapshot.planSlots.length +
      snapshot.derivedGroceryItems.length +
      snapshot.manualGroceryItems.length +
      snapshot.workoutTemplates.length +
      snapshot.exerciseCatalogItems.length +
      snapshot.favoriteMeals.length +
      snapshot.healthEvents.length +
      snapshot.healthTemplates.length +
      snapshot.sobrietyEvents.length +
      snapshot.assessmentResults.length +
      snapshot.importBatches.length +
      snapshot.importArtifacts.length +
      snapshot.reviewSnapshots.length +
      snapshot.adherenceMatches.length,
  });
}
