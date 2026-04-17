import type { RequestHandler } from './$types';
import { lookupNutritionBarcodeServer } from '$lib/server/nutrition/service';

export const POST: RequestHandler = async ({ params }) => {
  return Response.json(
    await lookupNutritionBarcodeServer(params.code ?? '')
  );
};
