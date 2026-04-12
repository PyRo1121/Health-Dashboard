import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createIntegrationsPageState,
  loadIntegrationsPage as loadIntegrationsPageController,
  type IntegrationsPageState,
} from './controller';

export { createIntegrationsPageState };

const integrationsClient = createFeatureActionClient<Parameters<typeof loadIntegrationsPageController>[0]>('/api/integrations');

export async function loadIntegrationsPage(): Promise<IntegrationsPageState> {
  return await integrationsClient.action('load', (db) => loadIntegrationsPageController(db));
}
