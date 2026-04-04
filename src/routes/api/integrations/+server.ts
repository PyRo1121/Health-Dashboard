import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import { loadIntegrationsPage } from '$lib/features/integrations/controller';

export async function POST() {
	return json(await withServerHealthDb((db) => loadIntegrationsPage(db)));
}
