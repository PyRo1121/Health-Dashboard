import { z } from 'zod';
import type { GroceriesPageState, ManualGroceryDraft } from './controller';

function isGroceriesPageState(value: unknown): value is GroceriesPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.saveNotice === 'string' &&
    (state.weeklyPlan === null ||
      (typeof state.weeklyPlan === 'object' && state.weeklyPlan !== null)) &&
    Array.isArray(state.groceryItems) &&
    Array.isArray(state.groceryWarnings) &&
    Array.isArray(state.recipeCatalogItems)
  );
}

const groceriesPageStateSchema = z.custom<GroceriesPageState>(isGroceriesPageState, {
  message: 'Invalid groceries page state',
});

const manualGroceryDraftSchema = z.object({
  label: z.string(),
  quantityText: z.string(),
}) satisfies z.ZodType<ManualGroceryDraft>;

export const groceriesRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
  }),
  z.object({
    action: z.literal('toggle'),
    state: groceriesPageStateSchema,
    itemId: z.string(),
    patch: z.object({
      checked: z.boolean(),
      excluded: z.boolean(),
      onHand: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal('addManual'),
    state: groceriesPageStateSchema,
    draft: manualGroceryDraftSchema,
  }),
  z.object({
    action: z.literal('removeManual'),
    state: groceriesPageStateSchema,
    itemId: z.string(),
  }),
]);

export type GroceriesRequest = z.infer<typeof groceriesRequestSchema>;
