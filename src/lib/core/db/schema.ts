export const DB_NAME = 'personal-health-cockpit';
export const DB_VERSION = 9;

export const SCHEMA_STORES = {
  dailyRecords: 'id, date, updatedAt',
  journalEntries: 'id, localDay, entryType, updatedAt',
  foodEntries: 'id, localDay, mealType, updatedAt',
  foodCatalogItems: 'id, name, sourceType, barcode, updatedAt',
  recipeCatalogItems: 'id, title, mealType, cuisine, updatedAt',
  plannedMeals: 'id, mealType, updatedAt',
  weeklyPlans: 'id, weekStart, updatedAt',
  planSlots: 'id, weeklyPlanId, localDay, slotType, status, updatedAt',
  groceryItems: 'id, weeklyPlanId, aisle, checked, excluded, updatedAt',
  workoutTemplates: 'id, title, updatedAt',
  exerciseCatalogItems: 'id, title, sourceType, updatedAt',
  favoriteMeals: 'id, mealType, updatedAt',
  healthEvents: 'id, localDay, eventType, sourceType, sourceRecordId, updatedAt',
  healthTemplates: 'id, templateType, label, updatedAt',
  sobrietyEvents: 'id, localDay, eventType, updatedAt',
  assessmentResults: 'id, localDay, instrument, updatedAt',
  importBatches: 'id, sourceType, status, createdAt',
  importArtifacts: 'id, batchId, artifactType, createdAt',
  reviewSnapshots: 'id, weekStart, updatedAt',
  adherenceMatches: 'id, weekStart, planSlotId, localDay, outcome, fingerprint, updatedAt',
} as const;
