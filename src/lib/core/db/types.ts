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
  sortBy<Key extends keyof T & string>(field: Key): Promise<T[]>;
  and(predicate: (record: T) => boolean): HealthDbQuery<T>;
}

export interface HealthDbTable<T extends { id: string }> {
  put(record: T): Promise<string>;
  bulkAdd(records: readonly T[], ...args: unknown[]): Promise<unknown>;
  get(id: string): Promise<T | undefined>;
  delete(id: string): Promise<void>;
  toArray(): Promise<T[]>;
  where<Key extends keyof T & string>(
    field: Key
  ): {
    equals(value: T[Key]): HealthDbQuery<T>;
  };
}

export interface HealthDatabase {
  dailyRecords: HealthDbTable<DailyRecord>;
  journalEntries: HealthDbTable<JournalEntry>;
  foodEntries: HealthDbTable<FoodEntry>;
  foodCatalogItems: HealthDbTable<FoodCatalogItem>;
  recipeCatalogItems: HealthDbTable<RecipeCatalogItem>;
  weeklyPlans: HealthDbTable<WeeklyPlan>;
  planSlots: HealthDbTable<PlanSlot>;
  derivedGroceryItems: HealthDbTable<DerivedGroceryItem>;
  manualGroceryItems: HealthDbTable<ManualGroceryItem>;
  workoutTemplates: HealthDbTable<WorkoutTemplate>;
  exerciseCatalogItems: HealthDbTable<ExerciseCatalogItem>;
  favoriteMeals: HealthDbTable<FavoriteMeal>;
  healthEvents: HealthDbTable<HealthEvent>;
  healthTemplates: HealthDbTable<HealthTemplate>;
  sobrietyEvents: HealthDbTable<SobrietyEvent>;
  assessmentResults: HealthDbTable<AssessmentResult>;
  importBatches: HealthDbTable<ImportBatch>;
  importArtifacts: HealthDbTable<ImportArtifact>;
  reviewSnapshots: HealthDbTable<ReviewSnapshot>;
  adherenceMatches: HealthDbTable<AdherenceMatch>;
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
