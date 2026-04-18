import type {
  HealthDbAdherenceMatchesStore,
  HealthDbDerivedGroceryItemsStore,
  HealthDbManualGroceryItemsStore,
  HealthDbReviewSnapshotsStore,
} from '$lib/core/db/types';
import type {
  AdherenceMatch,
  DerivedGroceryItem,
  ManualGroceryItem,
  ReviewSnapshot,
} from '$lib/core/domain/types';
import type { WeeklyReviewData } from './analytics';

export interface ReviewArtifactStorage
  extends
    HealthDbReviewSnapshotsStore,
    HealthDbAdherenceMatchesStore,
    HealthDbDerivedGroceryItemsStore,
    HealthDbManualGroceryItemsStore {}

export async function listAdherenceMatchesForWeek(
  store: ReviewArtifactStorage,
  weekStart: string
): Promise<AdherenceMatch[]> {
  return await store.adherenceMatches.where('weekStart').equals(weekStart).toArray();
}

export async function listDerivedGroceriesForPlan(
  store: ReviewArtifactStorage,
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  return await store.derivedGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

export async function listManualGroceriesForPlan(
  store: ReviewArtifactStorage,
  weeklyPlanId: string
): Promise<ManualGroceryItem[]> {
  return await store.manualGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

export async function persistDerivedGroceries(
  store: ReviewArtifactStorage,
  nextItems: DerivedGroceryItem[],
  existingItems: DerivedGroceryItem[]
): Promise<void> {
  for (const item of nextItems) {
    await store.derivedGroceryItems.put(item);
  }

  for (const staleItem of existingItems) {
    if (!nextItems.find((item) => item.id === staleItem.id)) {
      await store.derivedGroceryItems.delete(staleItem.id);
    }
  }
}

export async function persistAdherenceMatches(
  store: ReviewArtifactStorage,
  nextMatches: AdherenceMatch[],
  existingMatches: AdherenceMatch[]
): Promise<void> {
  for (const match of nextMatches) {
    await store.adherenceMatches.put(match);
  }

  for (const staleMatch of existingMatches) {
    if (!nextMatches.find((match) => match.id === staleMatch.id)) {
      await store.adherenceMatches.delete(staleMatch.id);
    }
  }
}

export async function persistReviewSnapshot(
  store: ReviewArtifactStorage,
  weekly: WeeklyReviewData,
  snapshot: ReviewSnapshot = weekly.snapshot
): Promise<WeeklyReviewData> {
  await store.reviewSnapshots.put(snapshot);
  return snapshot === weekly.snapshot
    ? weekly
    : {
        ...weekly,
        snapshot,
      };
}
