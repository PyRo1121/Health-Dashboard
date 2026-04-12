import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  DerivedGroceryItem,
  ExerciseCatalogItem,
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  HealthTemplate,
  ImportArtifact,
  ImportBatch,
  JournalEntry,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  ReviewSnapshot,
  SobrietyEvent,
  WeeklyPlan,
  WorkoutTemplate,
} from '$lib/core/domain/types';

export interface HealthDbQuery<T> {
  first(): Promise<T | undefined>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  sortBy<Key extends keyof T & string>(field: Key): Promise<T[]>;
  and(predicate: (record: T) => boolean): HealthDbQuery<T>;
}

export interface HealthDbTable<T extends { id: string }> {
  put(record: T): Promise<string>;
  bulkAdd(records: readonly T[], ...args: unknown[]): Promise<unknown>;
  bulkPut(records: readonly T[]): Promise<unknown>;
  get(id: string): Promise<T | undefined>;
  delete(id: string): Promise<void>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  where<Key extends keyof T & string>(
    field: Key
  ): {
    equals(value: T[Key]): HealthDbQuery<T>;
  };
}

export interface HealthDbDailyRecordsStore {
  dailyRecords: HealthDbTable<DailyRecord>;
}

export interface HealthDbJournalEntriesStore {
  journalEntries: HealthDbTable<JournalEntry>;
}

export interface HealthDbFoodEntriesStore {
  foodEntries: HealthDbTable<FoodEntry>;
}

export interface HealthDbFoodCatalogItemsStore {
  foodCatalogItems: HealthDbTable<FoodCatalogItem>;
}

export interface HealthDbRecipeCatalogItemsStore {
  recipeCatalogItems: HealthDbTable<RecipeCatalogItem>;
}

export interface HealthDbWeeklyPlansStore {
  weeklyPlans: HealthDbTable<WeeklyPlan>;
}

export interface HealthDbPlanSlotsStore {
  planSlots: HealthDbTable<PlanSlot>;
}

export interface HealthDbDerivedGroceryItemsStore {
  derivedGroceryItems: HealthDbTable<DerivedGroceryItem>;
}

export interface HealthDbManualGroceryItemsStore {
  manualGroceryItems: HealthDbTable<ManualGroceryItem>;
}

export interface HealthDbWorkoutTemplatesStore {
  workoutTemplates: HealthDbTable<WorkoutTemplate>;
}

export interface HealthDbExerciseCatalogItemsStore {
  exerciseCatalogItems: HealthDbTable<ExerciseCatalogItem>;
}

export interface HealthDbFavoriteMealsStore {
  favoriteMeals: HealthDbTable<FavoriteMeal>;
}

export interface HealthDbHealthEventsStore {
  healthEvents: HealthDbTable<HealthEvent>;
}

export interface HealthDbHealthTemplatesStore {
  healthTemplates: HealthDbTable<HealthTemplate>;
}

export interface HealthDbSobrietyEventsStore {
  sobrietyEvents: HealthDbTable<SobrietyEvent>;
}

export interface HealthDbAssessmentResultsStore {
  assessmentResults: HealthDbTable<AssessmentResult>;
}

export interface HealthDbImportBatchesStore {
  importBatches: HealthDbTable<ImportBatch>;
}

export interface HealthDbImportArtifactsStore {
  importArtifacts: HealthDbTable<ImportArtifact>;
}

export interface HealthDbReviewSnapshotsStore {
  reviewSnapshots: HealthDbTable<ReviewSnapshot>;
}

export interface HealthDbAdherenceMatchesStore {
  adherenceMatches: HealthDbTable<AdherenceMatch>;
}

export interface HealthDbStores
  extends
    HealthDbDailyRecordsStore,
    HealthDbJournalEntriesStore,
    HealthDbFoodEntriesStore,
    HealthDbFoodCatalogItemsStore,
    HealthDbRecipeCatalogItemsStore,
    HealthDbWeeklyPlansStore,
    HealthDbPlanSlotsStore,
    HealthDbDerivedGroceryItemsStore,
    HealthDbManualGroceryItemsStore,
    HealthDbWorkoutTemplatesStore,
    HealthDbExerciseCatalogItemsStore,
    HealthDbFavoriteMealsStore,
    HealthDbHealthEventsStore,
    HealthDbHealthTemplatesStore,
    HealthDbSobrietyEventsStore,
    HealthDbAssessmentResultsStore,
    HealthDbImportBatchesStore,
    HealthDbImportArtifactsStore,
    HealthDbReviewSnapshotsStore,
    HealthDbAdherenceMatchesStore {}

export type HealthDbStoreName = keyof HealthDbStores;

export type HealthDbRecord<Name extends HealthDbStoreName> =
  HealthDbStores[Name] extends HealthDbTable<infer T> ? T : never;

export interface HealthDbLifecycle {
  close(): void;
  delete(): Promise<void>;
}

export interface HealthDbSnapshot {
  dailyRecords: DailyRecord[];
  journalEntries: JournalEntry[];
  foodEntries: FoodEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  weeklyPlans: WeeklyPlan[];
  planSlots: PlanSlot[];
  derivedGroceryItems: DerivedGroceryItem[];
  manualGroceryItems: ManualGroceryItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
  favoriteMeals: FavoriteMeal[];
  healthEvents: HealthEvent[];
  healthTemplates: HealthTemplate[];
  sobrietyEvents: SobrietyEvent[];
  assessmentResults: AssessmentResult[];
  importBatches: ImportBatch[];
  importArtifacts: ImportArtifact[];
  reviewSnapshots: ReviewSnapshot[];
  adherenceMatches: AdherenceMatch[];
}
