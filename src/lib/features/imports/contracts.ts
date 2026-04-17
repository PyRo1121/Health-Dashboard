import { z } from 'zod';
import { importSourceTypes } from '$lib/core/domain/types';

const ownerProfileSchema = z.object({
  fullName: z.string(),
  birthDate: z.string(),
});

const importPreviewInputSchema = z.object({
  sourceType: z.enum(importSourceTypes),
  rawText: z.string(),
  ownerProfile: ownerProfileSchema.nullish(),
});

export const importsRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({
    action: z.literal('preview'),
    input: importPreviewInputSchema,
  }),
  z.object({
    action: z.literal('commit'),
    batchId: z.string(),
  }),
]);

export type ImportPreviewInput = z.infer<typeof importPreviewInputSchema>;
export type ImportsRequest = z.infer<typeof importsRequestSchema>;
