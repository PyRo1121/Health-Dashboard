import { createDbPostHandler } from '$lib/server/http/action-route';
import {
  foodLookupResultFromCatalogItem,
  listFoodCatalogItems,
  type FoodLookupResult,
  upsertFoodCatalogItem,
} from '$lib/features/nutrition/service';
import {
  fetchOpenFoodFactsProductByBarcode,
  normalizeOpenFoodFactsBarcode,
  normalizeOpenFoodFactsProduct,
} from '$lib/server/nutrition/open-food-facts';

export const POST = createDbPostHandler<void, FoodLookupResult | null>(
  async (db, _body, { params }) => {
    const barcode = normalizeOpenFoodFactsBarcode(params.code ?? '');
    if (!barcode) {
      return null;
    }

    const catalogItems = await listFoodCatalogItems(db);
    const local = catalogItems.find((item) => item.barcode === barcode);
    if (local) {
      return foodLookupResultFromCatalogItem(local);
    }

    const product = await fetchOpenFoodFactsProductByBarcode(barcode);
    if (!product) return null;

    const normalized = normalizeOpenFoodFactsProduct(product);
    if (!normalized) return null;

    return foodLookupResultFromCatalogItem(await upsertFoodCatalogItem(db, normalized));
  },
  undefined,
  {
    parseBody: async () => undefined,
  }
);
