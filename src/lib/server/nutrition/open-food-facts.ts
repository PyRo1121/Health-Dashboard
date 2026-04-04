import { nowIso } from '$lib/core/domain/time';
import type { BaseRecord, FoodCatalogItem } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org';
const OPEN_FOOD_FACTS_SOURCE_NAME = 'Open Food Facts';
const OPEN_FOOD_FACTS_USER_AGENT = 'PersonalHealthCockpit/0.0.1 (local-only nutrition cache)';
const OPEN_FOOD_FACTS_FIELDS = [
	'code',
	'product_name',
	'product_name_en',
	'brands',
	'nutriments',
	'image_front_small_url',
	'image_url',
	'quantity',
	'ingredients_text'
].join(',');

interface OpenFoodFactsNutriments {
	'energy-kcal_100g'?: number;
	'energy-kcal'?: number;
	proteins_100g?: number;
	proteins?: number;
	fiber_100g?: number;
	fiber?: number;
	carbohydrates_100g?: number;
	carbohydrates?: number;
	fat_100g?: number;
	fat?: number;
}

export interface OpenFoodFactsProduct {
	code?: string;
	product_name?: string;
	product_name_en?: string;
	brands?: string;
	nutriments?: OpenFoodFactsNutriments;
	image_front_small_url?: string;
	image_url?: string;
	quantity?: string;
	ingredients_text?: string;
}

interface OpenFoodFactsProductResponse {
	status?: number;
	product?: OpenFoodFactsProduct;
}

interface OpenFoodFactsSearchResponse {
	products?: OpenFoodFactsProduct[];
}

function openFoodFactsHeaders(): HeadersInit {
	return {
		accept: 'application/json',
		'user-agent': OPEN_FOOD_FACTS_USER_AGENT
	};
}

function coerceNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

export function normalizeOpenFoodFactsBarcode(code: string): string {
	return code.replace(/\D+/g, '');
}

function bestProductName(product: OpenFoodFactsProduct): string | null {
	const candidate = product.product_name?.trim() || product.product_name_en?.trim();
	return candidate ? candidate : null;
}

function firstBrand(brands: string | undefined): string | undefined {
	if (!brands) return undefined;
	return brands
		.split(',')
		.map((brand) => brand.trim())
		.find(Boolean);
}

export function normalizeOpenFoodFactsProduct(
	product: OpenFoodFactsProduct,
	existing?: Pick<BaseRecord, 'id' | 'createdAt'> | null
): FoodCatalogItem | null {
	const barcode = normalizeOpenFoodFactsBarcode(product.code ?? '');
	const name = bestProductName(product);

	if (!barcode || !name) return null;

	const timestamp = nowIso();
	return {
		...updateRecordMeta(existing, `off:${barcode}`, timestamp),
		name,
		sourceType: 'open-food-facts',
		sourceName: OPEN_FOOD_FACTS_SOURCE_NAME,
		brandName: firstBrand(product.brands),
		barcode,
		calories: coerceNumber(product.nutriments?.['energy-kcal_100g'] ?? product.nutriments?.['energy-kcal']),
		protein: coerceNumber(product.nutriments?.proteins_100g ?? product.nutriments?.proteins),
		fiber: coerceNumber(product.nutriments?.fiber_100g ?? product.nutriments?.fiber),
		carbs: coerceNumber(product.nutriments?.carbohydrates_100g ?? product.nutriments?.carbohydrates),
		fat: coerceNumber(product.nutriments?.fat_100g ?? product.nutriments?.fat)
	};
}

async function readJson<T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T> {
	const response = await fetchImpl(url, {
		headers: openFoodFactsHeaders()
	});

	if (!response.ok) {
		throw new Error(`Open Food Facts request failed with ${response.status}`);
	}

	return (await response.json()) as T;
}

export async function fetchOpenFoodFactsProductByBarcode(
	barcode: string,
	fetchImpl: typeof fetch = fetch
): Promise<OpenFoodFactsProduct | null> {
	const normalizedBarcode = normalizeOpenFoodFactsBarcode(barcode);
	if (!normalizedBarcode) return null;

	const url =
		`${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${normalizedBarcode}.json?fields=` +
		encodeURIComponent(OPEN_FOOD_FACTS_FIELDS);
	const response = await readJson<OpenFoodFactsProductResponse>(url, fetchImpl);

	if (response.status !== 1 || !response.product) return null;
	return response.product;
}

export async function searchOpenFoodFactsProducts(
	query: string,
	fetchImpl: typeof fetch = fetch
): Promise<OpenFoodFactsProduct[]> {
	const normalized = query.trim();
	if (normalized.length < 2) return [];

	const params = new URLSearchParams({
		search_terms: normalized,
		search_simple: '1',
		action: 'process',
		json: '1',
		page_size: '10',
		fields: OPEN_FOOD_FACTS_FIELDS
	});

	const response = await readJson<OpenFoodFactsSearchResponse>(
		`${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?${params.toString()}`,
		fetchImpl
	);

	return Array.isArray(response.products) ? response.products : [];
}
