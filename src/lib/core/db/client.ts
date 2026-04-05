import Dexie, { type EntityTable } from 'dexie';
import { browser } from '$app/environment';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  DerivedGroceryItem,
  ExerciseCatalogItem,
  FoodCatalogItem,
  FavoriteMeal,
  FoodEntry,
  HealthEvent,
  HealthTemplate,
  ImportArtifact,
  ImportBatch,
  JournalEntry,
  ManualGroceryItem,
  PlanSlot,
  PlannedMeal,
  RecipeCatalogItem,
  ReviewSnapshot,
  SobrietyEvent,
  WeeklyPlan,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { DB_NAME, DB_VERSION, SCHEMA_STORES } from './schema';

export class HealthDatabase extends Dexie {
  dailyRecords!: EntityTable<DailyRecord, 'id'>;
  journalEntries!: EntityTable<JournalEntry, 'id'>;
  foodEntries!: EntityTable<FoodEntry, 'id'>;
  foodCatalogItems!: EntityTable<FoodCatalogItem, 'id'>;
  recipeCatalogItems!: EntityTable<RecipeCatalogItem, 'id'>;
  plannedMeals!: EntityTable<PlannedMeal, 'id'>;
  weeklyPlans!: EntityTable<WeeklyPlan, 'id'>;
  planSlots!: EntityTable<PlanSlot, 'id'>;
  derivedGroceryItems!: EntityTable<DerivedGroceryItem, 'id'>;
  manualGroceryItems!: EntityTable<ManualGroceryItem, 'id'>;
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>;
  exerciseCatalogItems!: EntityTable<ExerciseCatalogItem, 'id'>;
  favoriteMeals!: EntityTable<FavoriteMeal, 'id'>;
  healthEvents!: EntityTable<HealthEvent, 'id'>;
  healthTemplates!: EntityTable<HealthTemplate, 'id'>;
  sobrietyEvents!: EntityTable<SobrietyEvent, 'id'>;
  assessmentResults!: EntityTable<AssessmentResult, 'id'>;
  importBatches!: EntityTable<ImportBatch, 'id'>;
  importArtifacts!: EntityTable<ImportArtifact, 'id'>;
  reviewSnapshots!: EntityTable<ReviewSnapshot, 'id'>;
  adherenceMatches!: EntityTable<AdherenceMatch, 'id'>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(DB_VERSION).stores(SCHEMA_STORES);
  }
}

export function createHealthDb(name = DB_NAME): HealthDatabase {
  return new HealthDatabase(name);
}

let clientDb: HealthDatabase | null = null;

export function getHealthDb(): HealthDatabase {
  if (!browser && !import.meta.env.MODE.startsWith('test')) {
    throw new Error('Health database is only available in browser-capable environments');
  }

  if (!clientDb) {
    clientDb = createHealthDb();
  }

  return clientDb;
}

export async function resetHealthDb(): Promise<void> {
  if (clientDb) {
    clientDb.close();
    await clientDb.delete();
    clientDb = null;
  }
}

export async function exportHealthDbSnapshot(db = getHealthDb()): Promise<HealthDbSnapshot> {
  const [
    dailyRecords,
    journalEntries,
    foodEntries,
    foodCatalogItems,
    recipeCatalogItems,
    plannedMeals,
    weeklyPlans,
    planSlots,
    derivedGroceryItems,
    manualGroceryItems,
    workoutTemplates,
    exerciseCatalogItems,
    favoriteMeals,
    healthEvents,
    healthTemplates,
    sobrietyEvents,
    assessmentResults,
    importBatches,
    importArtifacts,
    reviewSnapshots,
    adherenceMatches,
  ] = await Promise.all([
    db.dailyRecords.toArray(),
    db.journalEntries.toArray(),
    db.foodEntries.toArray(),
    db.foodCatalogItems.toArray(),
    db.recipeCatalogItems.toArray(),
    db.plannedMeals.toArray(),
    db.weeklyPlans.toArray(),
    db.planSlots.toArray(),
    db.derivedGroceryItems.toArray(),
    db.manualGroceryItems.toArray(),
    db.workoutTemplates.toArray(),
    db.exerciseCatalogItems.toArray(),
    db.favoriteMeals.toArray(),
    db.healthEvents.toArray(),
    db.healthTemplates.toArray(),
    db.sobrietyEvents.toArray(),
    db.assessmentResults.toArray(),
    db.importBatches.toArray(),
    db.importArtifacts.toArray(),
    db.reviewSnapshots.toArray(),
    db.adherenceMatches.toArray(),
  ]);

  return {
    dailyRecords,
    journalEntries,
    foodEntries,
    foodCatalogItems,
    recipeCatalogItems,
    plannedMeals,
    weeklyPlans,
    planSlots,
    derivedGroceryItems,
    manualGroceryItems,
    workoutTemplates,
    exerciseCatalogItems,
    favoriteMeals,
    healthEvents,
    healthTemplates,
    sobrietyEvents,
    assessmentResults,
    importBatches,
    importArtifacts,
    reviewSnapshots,
    adherenceMatches,
  };
}

export async function hasLegacyHealthDbData(db = getHealthDb()): Promise<boolean> {
  const snapshot = await exportHealthDbSnapshot(db);
  return Object.values(snapshot).some((records) => records.length > 0);
}
