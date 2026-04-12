CREATE TABLE `adherenceMatches` (
	`id` text PRIMARY KEY NOT NULL,
	`weekStart` text,
	`planSlotId` text,
	`localDay` text,
	`outcome` text,
	`fingerprint` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_weekStart` ON `adherenceMatches` (`weekStart`);--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_planSlotId` ON `adherenceMatches` (`planSlotId`);--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_localDay` ON `adherenceMatches` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_outcome` ON `adherenceMatches` (`outcome`);--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_fingerprint` ON `adherenceMatches` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_adherenceMatches_updatedAt` ON `adherenceMatches` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `assessmentResults` (
	`id` text PRIMARY KEY NOT NULL,
	`localDay` text,
	`instrument` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_assessmentResults_localDay` ON `assessmentResults` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_assessmentResults_instrument` ON `assessmentResults` (`instrument`);--> statement-breakpoint
CREATE INDEX `idx_assessmentResults_updatedAt` ON `assessmentResults` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `dailyRecords` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_dailyRecords_date` ON `dailyRecords` (`date`);--> statement-breakpoint
CREATE INDEX `idx_dailyRecords_updatedAt` ON `dailyRecords` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `derivedGroceryItems` (
	`id` text PRIMARY KEY NOT NULL,
	`weeklyPlanId` text,
	`aisle` text,
	`checked` text,
	`excluded` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_derivedGroceryItems_weeklyPlanId` ON `derivedGroceryItems` (`weeklyPlanId`);--> statement-breakpoint
CREATE INDEX `idx_derivedGroceryItems_aisle` ON `derivedGroceryItems` (`aisle`);--> statement-breakpoint
CREATE INDEX `idx_derivedGroceryItems_checked` ON `derivedGroceryItems` (`checked`);--> statement-breakpoint
CREATE INDEX `idx_derivedGroceryItems_excluded` ON `derivedGroceryItems` (`excluded`);--> statement-breakpoint
CREATE INDEX `idx_derivedGroceryItems_updatedAt` ON `derivedGroceryItems` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `exerciseCatalogItems` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`sourceType` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exerciseCatalogItems_title` ON `exerciseCatalogItems` (`title`);--> statement-breakpoint
CREATE INDEX `idx_exerciseCatalogItems_sourceType` ON `exerciseCatalogItems` (`sourceType`);--> statement-breakpoint
CREATE INDEX `idx_exerciseCatalogItems_updatedAt` ON `exerciseCatalogItems` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `favoriteMeals` (
	`id` text PRIMARY KEY NOT NULL,
	`mealType` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_favoriteMeals_mealType` ON `favoriteMeals` (`mealType`);--> statement-breakpoint
CREATE INDEX `idx_favoriteMeals_updatedAt` ON `favoriteMeals` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `foodCatalogItems` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`sourceType` text,
	`barcode` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_foodCatalogItems_name` ON `foodCatalogItems` (`name`);--> statement-breakpoint
CREATE INDEX `idx_foodCatalogItems_sourceType` ON `foodCatalogItems` (`sourceType`);--> statement-breakpoint
CREATE INDEX `idx_foodCatalogItems_barcode` ON `foodCatalogItems` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_foodCatalogItems_updatedAt` ON `foodCatalogItems` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `foodEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`localDay` text,
	`mealType` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_foodEntries_localDay` ON `foodEntries` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_foodEntries_mealType` ON `foodEntries` (`mealType`);--> statement-breakpoint
CREATE INDEX `idx_foodEntries_updatedAt` ON `foodEntries` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `healthEvents` (
	`id` text PRIMARY KEY NOT NULL,
	`localDay` text,
	`eventType` text,
	`sourceType` text,
	`sourceRecordId` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_healthEvents_localDay` ON `healthEvents` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_healthEvents_eventType` ON `healthEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_healthEvents_sourceType` ON `healthEvents` (`sourceType`);--> statement-breakpoint
CREATE INDEX `idx_healthEvents_sourceRecordId` ON `healthEvents` (`sourceRecordId`);--> statement-breakpoint
CREATE INDEX `idx_healthEvents_updatedAt` ON `healthEvents` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `healthTemplates` (
	`id` text PRIMARY KEY NOT NULL,
	`templateType` text,
	`label` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_healthTemplates_templateType` ON `healthTemplates` (`templateType`);--> statement-breakpoint
CREATE INDEX `idx_healthTemplates_label` ON `healthTemplates` (`label`);--> statement-breakpoint
CREATE INDEX `idx_healthTemplates_updatedAt` ON `healthTemplates` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `importArtifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`batchId` text,
	`artifactType` text,
	`createdAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_importArtifacts_batchId` ON `importArtifacts` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_importArtifacts_artifactType` ON `importArtifacts` (`artifactType`);--> statement-breakpoint
CREATE INDEX `idx_importArtifacts_createdAt` ON `importArtifacts` (`createdAt`);--> statement-breakpoint
CREATE TABLE `importBatches` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceType` text,
	`status` text,
	`createdAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_importBatches_sourceType` ON `importBatches` (`sourceType`);--> statement-breakpoint
CREATE INDEX `idx_importBatches_status` ON `importBatches` (`status`);--> statement-breakpoint
CREATE INDEX `idx_importBatches_createdAt` ON `importBatches` (`createdAt`);--> statement-breakpoint
CREATE TABLE `journalEntries` (
	`id` text PRIMARY KEY NOT NULL,
	`localDay` text,
	`entryType` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_journalEntries_localDay` ON `journalEntries` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_journalEntries_entryType` ON `journalEntries` (`entryType`);--> statement-breakpoint
CREATE INDEX `idx_journalEntries_updatedAt` ON `journalEntries` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `manualGroceryItems` (
	`id` text PRIMARY KEY NOT NULL,
	`weeklyPlanId` text,
	`aisle` text,
	`checked` text,
	`excluded` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_manualGroceryItems_weeklyPlanId` ON `manualGroceryItems` (`weeklyPlanId`);--> statement-breakpoint
CREATE INDEX `idx_manualGroceryItems_aisle` ON `manualGroceryItems` (`aisle`);--> statement-breakpoint
CREATE INDEX `idx_manualGroceryItems_checked` ON `manualGroceryItems` (`checked`);--> statement-breakpoint
CREATE INDEX `idx_manualGroceryItems_excluded` ON `manualGroceryItems` (`excluded`);--> statement-breakpoint
CREATE INDEX `idx_manualGroceryItems_updatedAt` ON `manualGroceryItems` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `planSlots` (
	`id` text PRIMARY KEY NOT NULL,
	`weeklyPlanId` text,
	`localDay` text,
	`slotType` text,
	`status` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_planSlots_weeklyPlanId` ON `planSlots` (`weeklyPlanId`);--> statement-breakpoint
CREATE INDEX `idx_planSlots_localDay` ON `planSlots` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_planSlots_slotType` ON `planSlots` (`slotType`);--> statement-breakpoint
CREATE INDEX `idx_planSlots_status` ON `planSlots` (`status`);--> statement-breakpoint
CREATE INDEX `idx_planSlots_updatedAt` ON `planSlots` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `recipeCatalogItems` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`mealType` text,
	`cuisine` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recipeCatalogItems_title` ON `recipeCatalogItems` (`title`);--> statement-breakpoint
CREATE INDEX `idx_recipeCatalogItems_mealType` ON `recipeCatalogItems` (`mealType`);--> statement-breakpoint
CREATE INDEX `idx_recipeCatalogItems_cuisine` ON `recipeCatalogItems` (`cuisine`);--> statement-breakpoint
CREATE INDEX `idx_recipeCatalogItems_updatedAt` ON `recipeCatalogItems` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `reviewSnapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`weekStart` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reviewSnapshots_weekStart` ON `reviewSnapshots` (`weekStart`);--> statement-breakpoint
CREATE INDEX `idx_reviewSnapshots_updatedAt` ON `reviewSnapshots` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `sobrietyEvents` (
	`id` text PRIMARY KEY NOT NULL,
	`localDay` text,
	`eventType` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sobrietyEvents_localDay` ON `sobrietyEvents` (`localDay`);--> statement-breakpoint
CREATE INDEX `idx_sobrietyEvents_eventType` ON `sobrietyEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_sobrietyEvents_updatedAt` ON `sobrietyEvents` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `weeklyPlans` (
	`id` text PRIMARY KEY NOT NULL,
	`weekStart` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_weeklyPlans_weekStart` ON `weeklyPlans` (`weekStart`);--> statement-breakpoint
CREATE INDEX `idx_weeklyPlans_updatedAt` ON `weeklyPlans` (`updatedAt`);--> statement-breakpoint
CREATE TABLE `workoutTemplates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`updatedAt` text,
	`record_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workoutTemplates_title` ON `workoutTemplates` (`title`);--> statement-breakpoint
CREATE INDEX `idx_workoutTemplates_updatedAt` ON `workoutTemplates` (`updatedAt`);