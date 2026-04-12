import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Mirrors the current physical Bun SQLite layout so Phase 1 can cut over without
// changing the on-disk shape before the feature rewrite lands.

export const dailyRecords = sqliteTable('dailyRecords', {
  id: text('id').primaryKey(),
  date: text('date'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_dailyRecords_date').on(table.date),
  index('idx_dailyRecords_updatedAt').on(table.updatedAt),
]);

export const journalEntries = sqliteTable('journalEntries', {
  id: text('id').primaryKey(),
  localDay: text('localDay'),
  entryType: text('entryType'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_journalEntries_localDay').on(table.localDay),
  index('idx_journalEntries_entryType').on(table.entryType),
  index('idx_journalEntries_updatedAt').on(table.updatedAt),
]);

export const foodEntries = sqliteTable('foodEntries', {
  id: text('id').primaryKey(),
  localDay: text('localDay'),
  mealType: text('mealType'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_foodEntries_localDay').on(table.localDay),
  index('idx_foodEntries_mealType').on(table.mealType),
  index('idx_foodEntries_updatedAt').on(table.updatedAt),
]);

export const foodCatalogItems = sqliteTable('foodCatalogItems', {
  id: text('id').primaryKey(),
  name: text('name'),
  sourceType: text('sourceType'),
  barcode: text('barcode'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_foodCatalogItems_name').on(table.name),
  index('idx_foodCatalogItems_sourceType').on(table.sourceType),
  index('idx_foodCatalogItems_barcode').on(table.barcode),
  index('idx_foodCatalogItems_updatedAt').on(table.updatedAt),
]);

export const recipeCatalogItems = sqliteTable('recipeCatalogItems', {
  id: text('id').primaryKey(),
  title: text('title'),
  mealType: text('mealType'),
  cuisine: text('cuisine'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_recipeCatalogItems_title').on(table.title),
  index('idx_recipeCatalogItems_mealType').on(table.mealType),
  index('idx_recipeCatalogItems_cuisine').on(table.cuisine),
  index('idx_recipeCatalogItems_updatedAt').on(table.updatedAt),
]);

export const weeklyPlans = sqliteTable('weeklyPlans', {
  id: text('id').primaryKey(),
  weekStart: text('weekStart'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_weeklyPlans_weekStart').on(table.weekStart),
  index('idx_weeklyPlans_updatedAt').on(table.updatedAt),
]);

export const planSlots = sqliteTable('planSlots', {
  id: text('id').primaryKey(),
  weeklyPlanId: text('weeklyPlanId'),
  localDay: text('localDay'),
  slotType: text('slotType'),
  status: text('status'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_planSlots_weeklyPlanId').on(table.weeklyPlanId),
  index('idx_planSlots_localDay').on(table.localDay),
  index('idx_planSlots_slotType').on(table.slotType),
  index('idx_planSlots_status').on(table.status),
  index('idx_planSlots_updatedAt').on(table.updatedAt),
]);

export const derivedGroceryItems = sqliteTable('derivedGroceryItems', {
  id: text('id').primaryKey(),
  weeklyPlanId: text('weeklyPlanId'),
  aisle: text('aisle'),
  checked: text('checked'),
  excluded: text('excluded'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_derivedGroceryItems_weeklyPlanId').on(table.weeklyPlanId),
  index('idx_derivedGroceryItems_aisle').on(table.aisle),
  index('idx_derivedGroceryItems_checked').on(table.checked),
  index('idx_derivedGroceryItems_excluded').on(table.excluded),
  index('idx_derivedGroceryItems_updatedAt').on(table.updatedAt),
]);

export const manualGroceryItems = sqliteTable('manualGroceryItems', {
  id: text('id').primaryKey(),
  weeklyPlanId: text('weeklyPlanId'),
  aisle: text('aisle'),
  checked: text('checked'),
  excluded: text('excluded'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_manualGroceryItems_weeklyPlanId').on(table.weeklyPlanId),
  index('idx_manualGroceryItems_aisle').on(table.aisle),
  index('idx_manualGroceryItems_checked').on(table.checked),
  index('idx_manualGroceryItems_excluded').on(table.excluded),
  index('idx_manualGroceryItems_updatedAt').on(table.updatedAt),
]);

export const workoutTemplates = sqliteTable('workoutTemplates', {
  id: text('id').primaryKey(),
  title: text('title'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_workoutTemplates_title').on(table.title),
  index('idx_workoutTemplates_updatedAt').on(table.updatedAt),
]);

export const exerciseCatalogItems = sqliteTable('exerciseCatalogItems', {
  id: text('id').primaryKey(),
  title: text('title'),
  sourceType: text('sourceType'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_exerciseCatalogItems_title').on(table.title),
  index('idx_exerciseCatalogItems_sourceType').on(table.sourceType),
  index('idx_exerciseCatalogItems_updatedAt').on(table.updatedAt),
]);

export const favoriteMeals = sqliteTable('favoriteMeals', {
  id: text('id').primaryKey(),
  mealType: text('mealType'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_favoriteMeals_mealType').on(table.mealType),
  index('idx_favoriteMeals_updatedAt').on(table.updatedAt),
]);

export const healthEvents = sqliteTable('healthEvents', {
  id: text('id').primaryKey(),
  localDay: text('localDay'),
  eventType: text('eventType'),
  sourceType: text('sourceType'),
  sourceRecordId: text('sourceRecordId'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_healthEvents_localDay').on(table.localDay),
  index('idx_healthEvents_eventType').on(table.eventType),
  index('idx_healthEvents_sourceType').on(table.sourceType),
  index('idx_healthEvents_sourceRecordId').on(table.sourceRecordId),
  index('idx_healthEvents_updatedAt').on(table.updatedAt),
]);

export const healthTemplates = sqliteTable('healthTemplates', {
  id: text('id').primaryKey(),
  templateType: text('templateType'),
  label: text('label'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_healthTemplates_templateType').on(table.templateType),
  index('idx_healthTemplates_label').on(table.label),
  index('idx_healthTemplates_updatedAt').on(table.updatedAt),
]);

export const sobrietyEvents = sqliteTable('sobrietyEvents', {
  id: text('id').primaryKey(),
  localDay: text('localDay'),
  eventType: text('eventType'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_sobrietyEvents_localDay').on(table.localDay),
  index('idx_sobrietyEvents_eventType').on(table.eventType),
  index('idx_sobrietyEvents_updatedAt').on(table.updatedAt),
]);

export const assessmentResults = sqliteTable('assessmentResults', {
  id: text('id').primaryKey(),
  localDay: text('localDay'),
  instrument: text('instrument'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_assessmentResults_localDay').on(table.localDay),
  index('idx_assessmentResults_instrument').on(table.instrument),
  index('idx_assessmentResults_updatedAt').on(table.updatedAt),
]);

export const importBatches = sqliteTable('importBatches', {
  id: text('id').primaryKey(),
  sourceType: text('sourceType'),
  status: text('status'),
  createdAt: text('createdAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_importBatches_sourceType').on(table.sourceType),
  index('idx_importBatches_status').on(table.status),
  index('idx_importBatches_createdAt').on(table.createdAt),
]);

export const importArtifacts = sqliteTable('importArtifacts', {
  id: text('id').primaryKey(),
  batchId: text('batchId'),
  artifactType: text('artifactType'),
  createdAt: text('createdAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_importArtifacts_batchId').on(table.batchId),
  index('idx_importArtifacts_artifactType').on(table.artifactType),
  index('idx_importArtifacts_createdAt').on(table.createdAt),
]);

export const reviewSnapshots = sqliteTable('reviewSnapshots', {
  id: text('id').primaryKey(),
  weekStart: text('weekStart'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_reviewSnapshots_weekStart').on(table.weekStart),
  index('idx_reviewSnapshots_updatedAt').on(table.updatedAt),
]);

export const adherenceMatches = sqliteTable('adherenceMatches', {
  id: text('id').primaryKey(),
  weekStart: text('weekStart'),
  planSlotId: text('planSlotId'),
  localDay: text('localDay'),
  outcome: text('outcome'),
  fingerprint: text('fingerprint'),
  updatedAt: text('updatedAt'),
  recordJson: text('record_json').notNull(),
}, (table) => [
  index('idx_adherenceMatches_weekStart').on(table.weekStart),
  index('idx_adherenceMatches_planSlotId').on(table.planSlotId),
  index('idx_adherenceMatches_localDay').on(table.localDay),
  index('idx_adherenceMatches_outcome').on(table.outcome),
  index('idx_adherenceMatches_fingerprint').on(table.fingerprint),
  index('idx_adherenceMatches_updatedAt').on(table.updatedAt),
]);

export const drizzleSchema = {
  dailyRecords,
  journalEntries,
  foodEntries,
  foodCatalogItems,
  recipeCatalogItems,
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
} as const;
