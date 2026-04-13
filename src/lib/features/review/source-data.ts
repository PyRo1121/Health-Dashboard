import type {
  HealthDbAssessmentResultsStore,
  HealthDbDailyRecordsStore,
  HealthDbFoodCatalogItemsStore,
  HealthDbFoodEntriesStore,
  HealthDbHealthEventsStore,
  HealthDbJournalEntriesStore,
  HealthDbPlanSlotsStore,
  HealthDbRecipeCatalogItemsStore,
  HealthDbSobrietyEventsStore,
  HealthDbWeeklyPlansStore,
} from '$lib/core/db/types';
import type { ReviewSourceData } from './snapshot-builder';

export interface ReviewSourceDataStorage
  extends
    HealthDbDailyRecordsStore,
    HealthDbFoodEntriesStore,
    HealthDbSobrietyEventsStore,
    HealthDbAssessmentResultsStore,
    HealthDbHealthEventsStore,
    HealthDbJournalEntriesStore,
    HealthDbFoodCatalogItemsStore,
    HealthDbRecipeCatalogItemsStore,
    HealthDbWeeklyPlansStore,
    HealthDbPlanSlotsStore {}

export async function loadReviewSourceData(
  store: ReviewSourceDataStorage
): Promise<ReviewSourceData> {
  const [
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  ] = await Promise.all([
    store.dailyRecords.toArray(),
    store.foodEntries.toArray(),
    store.sobrietyEvents.toArray(),
    store.assessmentResults.toArray(),
    store.healthEvents.toArray(),
    store.journalEntries.toArray(),
    store.foodCatalogItems.toArray(),
    store.recipeCatalogItems.toArray(),
    store.weeklyPlans.toArray(),
    store.planSlots.toArray(),
  ]);

  return {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  };
}
