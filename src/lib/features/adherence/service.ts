import type { HealthDbAdherenceMatchesStore } from '$lib/core/db/types';
import type { AdherenceMatch, FoodEntry, PlanSlot } from '$lib/core/domain/types';
import { computeWeekAdherenceMatches } from './matching';

export type AdherenceMatchesStore = HealthDbAdherenceMatchesStore;

export async function buildWeekAdherenceMatches(
  store: AdherenceMatchesStore,
  weekStart: string,
  planSlots: PlanSlot[],
  foodEntries: FoodEntry[],
  anchorDay: string
): Promise<AdherenceMatch[]> {
  const existingMatches = await store.adherenceMatches.where('weekStart').equals(weekStart).toArray();
  const computation = computeWeekAdherenceMatches({
    existingMatches,
    weekStart,
    planSlots,
    foodEntries,
    anchorDay,
  });

  if (computation.reusedExisting) {
    return computation.matches;
  }

  for (const match of computation.matches) {
    await store.adherenceMatches.put(match);
  }

  for (const stale of existingMatches) {
    if (!computation.matches.find((match) => match.id === stale.id)) {
      await store.adherenceMatches.delete(stale.id);
    }
  }

  return computation.matches;
}
