import { z } from 'zod';

export const PluginStatus = z.object({
  state: z.enum(['not-started', 'running', 'crashed']),
  hanging: z.boolean(),
  error: z.string().nullable(),
});

export type PluginStatus = z.infer<typeof PluginStatus>;
