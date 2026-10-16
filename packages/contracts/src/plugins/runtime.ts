import { z } from 'zod';

export const PluginStatus = z.object({
  state: z.enum(['not-started', 'running', 'crashed']),
  hanging: z.boolean(),
  error: z.string().nullable(),
});

export type PluginStatus = z.infer<typeof PluginStatus>;

export const PluginFailure = z.object({
  pluginId: z.string().brand<'PluginId'>(),
  name: z.string(),
  message: z.string(),
  key: z.uuid().brand<'PluginFailureId'>(),
});

export type PluginFailure = z.infer<typeof PluginFailure>;
