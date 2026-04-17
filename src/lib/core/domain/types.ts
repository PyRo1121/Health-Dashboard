export type RecordId = string;
export type IsoDateTime = string;
export type LocalDay = string;

export const importSourceTypes = [
  'apple-health-xml',
  'day-one-json',
  'healthkit-companion',
  'smart-fhir-sandbox',
] as const;
export type ImportSourceType = (typeof importSourceTypes)[number];

export const sourceTypes = ['manual', 'import', 'derived', 'native-companion'] as const;
export type SourceType = (typeof sourceTypes)[number];
export type NativeCompanionConnector = 'healthkit-ios';
export type NativeCompanionSourcePlatform = 'ios';
export type HealthTemplateType = 'medication' | 'supplement';
export type FoodCatalogSource = 'custom' | 'open-food-facts' | 'usda-fallback';
export type ManualHealthEventType =
  | 'symptom'
  | 'anxiety-episode'
  | 'sleep-note'
  | 'medication-dose'
  | 'supplement-dose';

export interface OwnerProfile {
  fullName: string;
  birthDate: string;
}

export interface BaseRecord {
  id: RecordId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Provenance {
  sourceType: SourceType;
  sourceApp: string;
  sourceRecordId?: string;
  sourceTimestamp?: IsoDateTime;
  localDay: LocalDay;
  timezone?: string;
  connector?: NativeCompanionConnector;
  connectorVersion?: number;
  deviceId?: string;
  sourcePlatform?: NativeCompanionSourcePlatform;
  confidence: number;
}

export interface DailyRecord extends BaseRecord {
  date: LocalDay;
  mood?: number;
  energy?: number;
  stress?: number;
  focus?: number;
  sleepHours?: number;
  sleepQuality?: number;
  sobrietyStatus?: 'sober' | 'lapse' | 'recovery';
  cravingScore?: number;
  freeformNote?: string;
}

export interface JournalEntry extends BaseRecord {
  entryType: JournalEntryType;
  localDay: LocalDay;
  title?: string;
  body: string;
  tags: string[];
  linkedEventIds: string[];
}

export const journalEntryTypes = [
  'freeform',
  'morning_intention',
  'evening_review',
  'craving_reflection',
  'lapse_reflection',
  'symptom_note',
  'experiment_note',
  'provider_visit_note',
] as const;
export type JournalEntryType = (typeof journalEntryTypes)[number];

export interface FoodEntry extends BaseRecord {
  localDay: LocalDay;
  mealType?: string;
  name?: string;
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  sourceName?: string;
  notes?: string;
  favoriteMealId?: string;
}

export interface FavoriteMeal extends BaseRecord {
  name: string;
  mealType: string;
  items: Array<{
    name: string;
    calories?: number;
    protein?: number;
    fiber?: number;
    carbs?: number;
    fat?: number;
    sourceName?: string;
  }>;
}

export interface PlannedMeal extends BaseRecord {
  name: string;
  mealType: string;
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  sourceName?: string;
  notes?: string;
}

export interface WeeklyPlan extends BaseRecord {
  weekStart: LocalDay;
  title: string;
  notes?: string;
  mode?: 'balanced' | 'recovery' | 'training';
}

export interface PlanSlot extends BaseRecord {
  weeklyPlanId: RecordId;
  localDay: LocalDay;
  slotType: 'meal' | 'workout' | 'note';
  itemType: 'recipe' | 'food' | 'workout-template' | 'freeform';
  itemId?: RecordId;
  mealType?: string;
  title: string;
  notes?: string;
  status: 'planned' | 'done' | 'skipped';
  order: number;
}

export interface GroceryItem extends BaseRecord {
  weeklyPlanId: RecordId;
  ingredientKey: string;
  label: string;
  quantityText?: string;
  manual?: boolean;
  aisle?: string;
  checked: boolean;
  excluded: boolean;
  onHand: boolean;
  sourceRecipeIds: RecordId[];
}

export interface DerivedGroceryItem extends BaseRecord {
  weeklyPlanId: RecordId;
  ingredientKey: string;
  label: string;
  quantityText?: string;
  aisle?: string;
  checked: boolean;
  excluded: boolean;
  onHand: boolean;
  sourceRecipeIds: RecordId[];
}

export interface ManualGroceryItem extends BaseRecord {
  weeklyPlanId: RecordId;
  ingredientKey: string;
  label: string;
  quantityText?: string;
  aisle?: string;
  checked: boolean;
  excluded: boolean;
  onHand: boolean;
}

export interface WorkoutTemplateExerciseRef {
  name: string;
  exerciseCatalogId?: RecordId;
  sets?: number;
  reps?: string;
  restSeconds?: number;
}

export interface WorkoutTemplate extends BaseRecord {
  title: string;
  goal?: string;
  exerciseRefs: WorkoutTemplateExerciseRef[];
}

export interface ExerciseCatalogItem extends BaseRecord {
  sourceType: 'wger';
  externalId: string;
  title: string;
  muscleGroups: string[];
  equipment: string[];
  instructions?: string;
  imageUrl?: string;
}

export interface RecipeCatalogItem extends BaseRecord {
  title: string;
  sourceType: 'themealdb';
  sourceName: string;
  externalId: string;
  imageUrl?: string;
  mealType?: string;
  cuisine?: string;
  ingredients: string[];
  instructions?: string;
}

export interface FoodCatalogItem extends BaseRecord {
  name: string;
  sourceType: FoodCatalogSource;
  sourceName: string;
  externalId?: string;
  brandName?: string;
  barcode?: string;
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  ingredientsText?: string;
  servingAmount?: number;
  servingUnit?: string;
  lastVerifiedAt?: IsoDateTime;
}

export interface SymptomHealthEventPayload {
  kind: 'symptom';
  symptom: string;
  severity: number;
  note?: string;
  referenceUrl?: string;
}

export interface AnxietyHealthEventPayload {
  kind: 'anxiety';
  intensity: number;
  trigger?: string;
  durationMinutes?: number;
  note?: string;
}

export interface SleepNoteHealthEventPayload {
  kind: 'sleep-note';
  note: string;
  restfulness?: number;
  context?: string;
}

export interface TemplateDoseHealthEventPayload {
  kind: 'template-dose';
  templateId: RecordId;
  templateName: string;
  templateType: HealthTemplateType;
  amount?: number;
  unit?: string;
  note?: string;
  referenceUrl?: string;
}

export type ManualHealthEventPayload =
  | SymptomHealthEventPayload
  | AnxietyHealthEventPayload
  | SleepNoteHealthEventPayload
  | TemplateDoseHealthEventPayload;

export interface HealthEvent extends BaseRecord, Provenance {
  eventType: string;
  value?: number | string | boolean;
  unit?: string;
  payload?: Record<string, unknown>;
}

export interface HealthTemplate extends BaseRecord {
  label: string;
  templateType: HealthTemplateType;
  defaultDose?: number;
  defaultUnit?: string;
  note?: string;
  referenceUrl?: string;
  archived?: boolean;
}

export interface NativeCompanionRecord {
  id: string;
  recordedAt: IsoDateTime;
  metricType: string;
  unit: string;
  value: number;
  startAt?: IsoDateTime;
  endAt?: IsoDateTime;
  metadata?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface NativeCompanionBundle {
  connector: NativeCompanionConnector;
  connectorVersion: number;
  deviceId: string;
  deviceName: string;
  sourcePlatform: NativeCompanionSourcePlatform;
  capturedAt: IsoDateTime;
  timezone: string;
  records: NativeCompanionRecord[];
}

export interface SobrietyEvent extends BaseRecord {
  localDay: LocalDay;
  eventType: 'status' | 'craving' | 'lapse' | 'recovery';
  status?: 'sober' | 'lapse' | 'recovery';
  cravingScore?: number;
  triggerTags?: string[];
  recoveryAction?: string;
  note?: string;
}

export interface AssessmentResult extends BaseRecord {
  localDay: LocalDay;
  instrument: 'PHQ-9' | 'GAD-7' | 'WHO-5' | 'AUDIT-C' | 'AUDIT';
  version: number;
  recallWindow: string;
  band?: string;
  itemResponses: number[];
  isComplete: boolean;
  highRisk: boolean;
  totalScore?: number;
}

export interface ImportBatch extends BaseRecord {
  sourceType: ImportSourceType;
  status: 'staged' | 'committed' | 'failed';
  summary?: {
    adds: number;
    duplicates: number;
    warnings: number;
  };
}

export interface ImportPreviewResult {
  sourceType: ImportSourceType;
  status: 'preview';
  summary: {
    adds: number;
    duplicates: number;
    warnings: number;
  };
}

export interface ImportArtifact extends BaseRecord {
  batchId: string;
  artifactType: string;
  fingerprint?: string;
  payload?: Record<string, unknown>;
}

export interface ReviewSnapshot extends BaseRecord {
  weekStart: LocalDay;
  headline: string;
  daysTracked: number;
  flags: string[];
  correlations: Array<{
    label: string;
    detail: string;
    sourceDays: string[];
  }>;
  experimentId?: string;
  experiment?: string;
}

export interface AdherenceMatch extends BaseRecord {
  weekStart: LocalDay;
  planSlotId: RecordId;
  localDay: LocalDay;
  slotType: PlanSlot['slotType'];
  slotTitle: string;
  outcome: 'hit' | 'miss' | 'pending';
  matchSource: 'slot-status' | 'food-entry' | 'inferred-none' | 'pending';
  matchedRecordId?: RecordId;
  confidence: 'explicit' | 'inferred';
  reason: string;
  fingerprint: string;
}

export interface NativeCompanionSummary {
  importedEvents: number;
  deviceNames: string[];
  metricTypes: string[];
  latestCaptureAt?: IsoDateTime;
}
