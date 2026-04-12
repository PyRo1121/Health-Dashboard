import type { PlanSlot } from '$lib/core/domain/types';

export function sortPlanSlots(slots: PlanSlot[]): PlanSlot[] {
  return [...slots].sort(
    (left, right) =>
      left.localDay.localeCompare(right.localDay) ||
      left.order - right.order ||
      left.createdAt.localeCompare(right.createdAt)
  );
}
