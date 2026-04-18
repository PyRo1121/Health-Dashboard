import type { RequestHandler } from './$types';
import { sobrietyRequestSchema } from '$lib/features/sobriety/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  loadSobrietyPageServer,
  markSobrietyStatusServer,
  saveSobrietyCravingServer,
  saveSobrietyLapseServer,
} from '$lib/server/sobriety/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: sobrietyRequestSchema,
  invalidMessage: 'Invalid sobriety request payload.',
  handlers: {
    load: async (data) => await loadSobrietyPageServer(data.localDay, data.state),
    markStatus: async (data) =>
      await markSobrietyStatusServer(data.state, data.status, data.notice),
    saveCraving: async (data) => await saveSobrietyCravingServer(data.state),
    saveLapse: async (data) => await saveSobrietyLapseServer(data.state),
  },
});
