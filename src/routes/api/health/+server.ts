import type { RequestHandler } from './$types';
import { healthRequestSchema } from '$lib/features/health/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  loadHealthPageServer,
  quickLogTemplatePageServer,
  saveAnxietyPageServer,
  saveSleepNotePageServer,
  saveSymptomPageServer,
  saveTemplatePageServer,
} from '$lib/server/health/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: healthRequestSchema,
  invalidMessage: 'Invalid health request payload.',
  handlers: {
    load: async (data) => await loadHealthPageServer(data.localDay),
    saveSymptom: async (data) => await saveSymptomPageServer(data.state),
    saveAnxiety: async (data) => await saveAnxietyPageServer(data.state),
    saveSleepNote: async (data) => await saveSleepNotePageServer(data.state),
    saveTemplate: async (data) => await saveTemplatePageServer(data.state),
    quickLogTemplate: async (data) => await quickLogTemplatePageServer(data.state, data.templateId),
  },
});
