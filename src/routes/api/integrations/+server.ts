import { loadIntegrationsPageServer } from '$lib/server/integrations/service';

export async function POST(): Promise<Response> {
  return Response.json(await loadIntegrationsPageServer());
}
