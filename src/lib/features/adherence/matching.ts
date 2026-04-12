import type { AdherenceMatch, FoodEntry, PlanSlot } from '$lib/core/domain/types';
import { sortPlanSlots } from '$lib/core/shared/plan-slots';
import { updateRecordMeta } from '$lib/core/shared/records';
import { textFingerprint } from '$lib/features/imports/core';

function sortFoodEntries(entries: FoodEntry[]): FoodEntry[] {
  return [...entries].sort(
    (left, right) =>
      left.localDay.localeCompare(right.localDay) || left.createdAt.localeCompare(right.createdAt)
  );
}

function sortAdherenceMatches(matches: AdherenceMatch[]): AdherenceMatch[] {
  return [...matches].sort(
    (left, right) =>
      left.localDay.localeCompare(right.localDay) || left.slotTitle.localeCompare(right.slotTitle)
  );
}

function normalizeLabel(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createWeekFingerprint(
  planSlots: PlanSlot[],
  foodEntries: FoodEntry[],
  anchorDay: string
): string {
  return textFingerprint(
    JSON.stringify({
      anchorDay,
      slots: sortPlanSlots(planSlots).map((slot) => ({
        id: slot.id,
        localDay: slot.localDay,
        slotType: slot.slotType,
        itemType: slot.itemType,
        itemId: slot.itemId,
        title: slot.title,
        mealType: slot.mealType,
        status: slot.status,
        updatedAt: slot.updatedAt,
      })),
      foodEntries: sortFoodEntries(foodEntries).map((entry) => ({
        id: entry.id,
        localDay: entry.localDay,
        mealType: entry.mealType,
        name: entry.name,
        sourceName: entry.sourceName,
        updatedAt: entry.updatedAt,
      })),
    })
  );
}

function createMissReason(slot: PlanSlot): string {
  if (slot.slotType === 'meal') {
    return `had no matching meal logged by the end of ${slot.localDay}.`;
  }

  return 'slipped past its planned day.';
}

function createHitReason(entry: FoodEntry): string {
  return `matched a logged meal on ${entry.localDay}.`;
}

function findMatchingFoodEntry(slot: PlanSlot, foodEntries: FoodEntry[]): FoodEntry | null {
  const target = normalizeLabel(slot.title);
  if (!target) {
    return null;
  }

  return (
    foodEntries.find(
      (entry) => entry.localDay === slot.localDay && normalizeLabel(entry.name) === target
    ) ?? null
  );
}

function buildAdherenceMatch(
  existing: AdherenceMatch | undefined,
  weekStart: string,
  slot: PlanSlot,
  foodEntries: FoodEntry[],
  anchorDay: string,
  fingerprint: string
): AdherenceMatch {
  const id = `adherence:${weekStart}:${slot.id}`;
  const base = {
    ...updateRecordMeta(existing, id),
    weekStart,
    planSlotId: slot.id,
    localDay: slot.localDay,
    slotType: slot.slotType,
    slotTitle: slot.title,
    fingerprint,
  } satisfies Omit<AdherenceMatch, 'outcome' | 'matchSource' | 'confidence' | 'reason'>;

  if (slot.status === 'done') {
    return {
      ...base,
      outcome: 'hit',
      matchSource: 'slot-status',
      matchedRecordId: slot.id,
      confidence: 'explicit',
      reason: 'was completed as planned.',
    };
  }

  if (slot.status === 'skipped') {
    return {
      ...base,
      outcome: 'miss',
      matchSource: 'slot-status',
      matchedRecordId: slot.id,
      confidence: 'explicit',
      reason: 'was skipped.',
    };
  }

  if (slot.slotType === 'meal') {
    const matchedEntry = findMatchingFoodEntry(slot, foodEntries);
    if (matchedEntry) {
      return {
        ...base,
        outcome: 'hit',
        matchSource: 'food-entry',
        matchedRecordId: matchedEntry.id,
        confidence: 'inferred',
        reason: createHitReason(matchedEntry),
      };
    }
  }

  if (slot.localDay < anchorDay) {
    return {
      ...base,
      outcome: 'miss',
      matchSource: 'inferred-none',
      confidence: 'inferred',
      reason: createMissReason(slot),
    };
  }

  return {
    ...base,
    outcome: 'pending',
    matchSource: 'pending',
    confidence: 'inferred',
    reason: 'is still upcoming.',
  };
}

export interface WeekAdherenceMatchComputationInput {
  existingMatches: AdherenceMatch[];
  weekStart: string;
  planSlots: PlanSlot[];
  foodEntries: FoodEntry[];
  anchorDay: string;
}

export interface WeekAdherenceMatchComputationResult {
  fingerprint: string;
  matches: AdherenceMatch[];
  reusedExisting: boolean;
}

export function computeWeekAdherenceMatches(
  input: WeekAdherenceMatchComputationInput
): WeekAdherenceMatchComputationResult {
  const { existingMatches, weekStart, planSlots, foodEntries, anchorDay } = input;
  const fingerprint = createWeekFingerprint(planSlots, foodEntries, anchorDay);

  if (
    existingMatches.length === planSlots.length &&
    existingMatches.every((match) => match.fingerprint === fingerprint)
  ) {
    return {
      fingerprint,
      matches: sortAdherenceMatches(existingMatches),
      reusedExisting: true,
    };
  }

  const existingById = new Map(existingMatches.map((match) => [match.id, match]));
  const matches = sortAdherenceMatches(
    sortPlanSlots(planSlots).map((slot) =>
      buildAdherenceMatch(
        existingById.get(`adherence:${weekStart}:${slot.id}`),
        weekStart,
        slot,
        foodEntries,
        anchorDay,
        fingerprint
      )
    )
  );

  return {
    fingerprint,
    matches,
    reusedExisting: false,
  };
}
