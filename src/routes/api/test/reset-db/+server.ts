import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetServerDrizzleStorage } from '$lib/server/db/drizzle/client';

const HEALTH_RESET_TOKEN = 'codex-e2e';

export const POST: RequestHandler = async ({ request }) => {
  const token = request.headers.get('x-health-reset-token');
  if (token !== HEALTH_RESET_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }

  resetServerDrizzleStorage();
  return json({ ok: true });
};
