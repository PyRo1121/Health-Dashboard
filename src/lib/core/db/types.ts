import type {
  AssessmentResult,
  DailyRecord,
  ExerciseCatalogItem,
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  GroceryItem,
  HealthEvent,
  HealthTemplate,
  ImportArtifact,
  ImportBatch,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
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
  plannedMeals: HealthDbTable<PlannedMeal>;
  weeklyPlans: HealthDbTable<WeeklyPlan>;
  planSlots: HealthDbTable<PlanSlot>;
  groceryItems: HealthDbTable<GroceryItem>;
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
  close(): void;
  delete(): Promise<void>;
}

export interface HealthDbSnapshot {
  dailyRecords: DailyRecord[];
  journalEntries: JournalEntry[];
  foodEntries: FoodEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  plannedMeals: PlannedMeal[];
  weeklyPlans: WeeklyPlan[];
  planSlots: PlanSlot[];
  groceryItems: GroceryItem[];
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
}
