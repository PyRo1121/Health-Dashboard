import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
  clearServerOwnerProfile,
  getServerOwnerProfile,
  saveServerOwnerProfile,
} from '$lib/server/settings/store';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';

const ownerProfileSchema = z.object({
  fullName: z.string(),
  birthDate: z.string(),
});

const settingsRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('load') }),
  z.object({
    action: z.literal('saveOwnerProfile'),
    profile: ownerProfileSchema,
  }),
  z.object({ action: z.literal('clearOwnerProfile') }),
]);

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: settingsRequestSchema,
  invalidMessage: 'Invalid settings request payload.',
  handlers: {
    load: async () => ({
      profile: await getServerOwnerProfile(),
    }),
    saveOwnerProfile: async (data) => ({
      profile: await saveServerOwnerProfile(data.profile),
    }),
    clearOwnerProfile: async () => {
      await clearServerOwnerProfile();
      return { ok: true };
    },
  },
});
