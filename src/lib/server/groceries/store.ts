import { eq } from 'drizzle-orm';
import type {
  DerivedGroceryItem,
  GroceryItem,
  ManualGroceryItem,
  PlanSlot,
} from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import {
  buildManualGroceryItemId,
  buildManualGroceryItemRecord,
  buildMergedGroceryItem,
  buildMergedWeeklyGroceries,
  deriveWeeklyGroceriesFromData,
  parseIngredientLine,
  parseMergedGroceryItemId,
  type WeeklyGroceriesDerivationResult,
} from '$lib/features/groceries/derivation';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById, upsertMirrorRecord } from '$lib/server/db/drizzle/mirror';
import {
  listDerivedGroceriesServer,
  listManualGroceriesServer,
  listRecipeCatalogItemsServer,
} from '$lib/server/planning/store';

export async function listMergedWeeklyGroceriesServer(weeklyPlanId: string): Promise<GroceryItem[]> {
  const [derivedItems, manualItems] = await Promise.all([
    listDerivedGroceriesServer(weeklyPlanId),
    listManualGroceriesServer(weeklyPlanId),
  ]);

  return buildMergedWeeklyGroceries(weeklyPlanId, derivedItems, manualItems);
}

export async function syncDerivedGroceriesServer(
  weeklyPlanId: string,
  slots: PlanSlot[]
): Promise<WeeklyGroceriesDerivationResult> {
  const { db } = getServerDrizzleClient();
  const [recipes, existingDerivedItems, manualItems] = await Promise.all([
    listRecipeCatalogItemsServer(),
    listDerivedGroceriesServer(weeklyPlanId),
    listManualGroceriesServer(weeklyPlanId),
  ]);

  const result = deriveWeeklyGroceriesFromData({
    weeklyPlanId,
    slots,
    recipes,
    existingDerivedItems,
    manualItems,
  });

  for (const item of result.derivedItems) {
    await upsertMirrorRecord(db, 'derivedGroceryItems', drizzleSchema.derivedGroceryItems, item);
  }
  for (const stale of existingDerivedItems) {
    if (!result.derivedItems.find((item) => item.id === stale.id)) {
      await db.delete(drizzleSchema.derivedGroceryItems).where(eq(drizzleSchema.derivedGroceryItems.id, stale.id));
    }
  }

  return result;
}

export async function setGroceryItemStateServer(
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<GroceryItem> {
  const { db } = getServerDrizzleClient();
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [derivedItem, manualItem] = await Promise.all([
    selectMirrorRecordById<DerivedGroceryItem>(db, drizzleSchema.derivedGroceryItems, `derived-grocery:${weeklyPlanId}:${ingredientKey}`),
    selectMirrorRecordById<ManualGroceryItem>(db, drizzleSchema.manualGroceryItems, `manual-grocery:${weeklyPlanId}:${ingredientKey}`),
  ]);
  if (!derivedItem && !manualItem) {
    throw new Error('Grocery item not found');
  }

  if (derivedItem) {
    await upsertMirrorRecord(db, 'derivedGroceryItems', drizzleSchema.derivedGroceryItems, {
      ...derivedItem,
      ...updateRecordMeta(derivedItem, derivedItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }
  if (manualItem) {
    await upsertMirrorRecord(db, 'manualGroceryItems', drizzleSchema.manualGroceryItems, {
      ...manualItem,
      ...updateRecordMeta(manualItem, manualItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }

  const merged = buildMergedGroceryItem(
    weeklyPlanId,
    ingredientKey,
    derivedItem
      ? { ...derivedItem, checked: patch.checked, excluded: patch.excluded, onHand: patch.onHand }
      : undefined,
    manualItem
      ? { ...manualItem, checked: patch.checked, excluded: patch.excluded, onHand: patch.onHand }
      : undefined
  );
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function saveManualGroceryItemServer(
  weeklyPlanId: string,
  rawLabel: string
): Promise<GroceryItem> {
  const parsed = parseIngredientLine(rawLabel);
  if (!parsed.ingredientKey || !parsed.label) {
    throw new Error('Manual grocery label is required');
  }

  const { db } = getServerDrizzleClient();
  const [existingManual, existingDerived] = await Promise.all([
    selectMirrorRecordById<ManualGroceryItem>(db, drizzleSchema.manualGroceryItems, buildManualGroceryItemId(weeklyPlanId, parsed.ingredientKey)),
    selectMirrorRecordById<DerivedGroceryItem>(db, drizzleSchema.derivedGroceryItems, `derived-grocery:${weeklyPlanId}:${parsed.ingredientKey}`),
  ]);

  const item = buildManualGroceryItemRecord({
    weeklyPlanId,
    parsed,
    existingManual,
    existingDerived,
  });
  await upsertMirrorRecord(db, 'manualGroceryItems', drizzleSchema.manualGroceryItems, item);

  const merged = buildMergedGroceryItem(weeklyPlanId, parsed.ingredientKey, existingDerived, item);
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function removeManualGroceryItemServer(itemId: string): Promise<GroceryItem | null> {
  const { db } = getServerDrizzleClient();
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [manualItem, derivedItem] = await Promise.all([
    selectMirrorRecordById<ManualGroceryItem>(db, drizzleSchema.manualGroceryItems, buildManualGroceryItemId(weeklyPlanId, ingredientKey)),
    selectMirrorRecordById<DerivedGroceryItem>(db, drizzleSchema.derivedGroceryItems, `derived-grocery:${weeklyPlanId}:${ingredientKey}`),
  ]);
  if (!manualItem) {
    throw new Error('Grocery item not found');
  }

  await db.delete(drizzleSchema.manualGroceryItems).where(eq(drizzleSchema.manualGroceryItems.id, manualItem.id));
  return derivedItem ? buildMergedGroceryItem(weeklyPlanId, ingredientKey, derivedItem) : null;
}
