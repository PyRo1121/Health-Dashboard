import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  PlaywrightModeRequiredError,
  resetServerDrizzleStorage,
} from '$lib/server/db/drizzle/client';

const HEALTH_RESET_TOKEN = 'codex-e2e';

export const POST: RequestHandler = async ({ request }) => {
  const token = request.headers.get('x-health-reset-token');
  if (token !== HEALTH_RESET_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    resetServerDrizzleStorage();
  } catch (error) {
    if (error instanceof PlaywrightModeRequiredError) {
      return new Response('Forbidden', { status: 403 });
    }
    throw error;
  }

  return json({ ok: true });
};
