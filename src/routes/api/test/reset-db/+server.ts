import { error, json } from '@sveltejs/kit';
import { PLAYWRIGHT_MODE_FLAG, resetServerHealthDb } from '$lib/server/db/client';
import { existsSync } from 'node:fs';

export async function POST({ request }) {
	const token = request.headers.get('x-health-reset-token');
	const modeEnabled = existsSync(PLAYWRIGHT_MODE_FLAG);
	if (!modeEnabled || token !== 'codex-e2e') {
		throw error(404);
	}

	try {
		await resetServerHealthDb();
		return json({ ok: true });
	} catch (cause) {
		console.error('reset-db failure', cause);
		return new Response(
			JSON.stringify({
				message: cause instanceof Error ? cause.message : 'reset failed'
			}),
			{
				status: 500,
				headers: {
					'content-type': 'application/json'
				}
			}
		);
	}
}
