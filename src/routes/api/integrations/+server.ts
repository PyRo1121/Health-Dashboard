import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadIntegrationsPage,
  type IntegrationsPageState,
} from '$lib/features/integrations/controller';

type IntegrationsRequest = { action: 'load' };

export const POST = createDbActionPostHandler<IntegrationsRequest, IntegrationsPageState>({
  load: (db) => loadIntegrationsPage(db),
});
