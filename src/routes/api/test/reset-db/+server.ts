import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  PlaywrightModeRequiredError,
  resetServerDrizzleStorage,
} from '$lib/server/db/drizzle/client';
import { requireControlPlaneToken } from '$lib/server/http/control-plane-guard';
import { clearServerOwnerProfile } from '$lib/server/settings/store';

export const POST: RequestHandler = async ({ request }) => {
  const authResponse = requireControlPlaneToken(request, {
    envVar: 'HEALTH_RESET_TOKEN',
    headerName: 'x-health-reset-token',
  });
  if (authResponse) {
    return authResponse;
  }

  try {
    resetServerDrizzleStorage();
    await clearServerOwnerProfile();
  } catch (error) {
    if (error instanceof PlaywrightModeRequiredError) {
      return new Response('Forbidden', { status: 403 });
    }
    throw error;
  }

  return json({ ok: true });
};
