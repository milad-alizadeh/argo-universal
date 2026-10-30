import { z } from 'zod';

export const PluginBadge = z.object({
  pluginId: z.string(),
  id: z.string(),
  count: z.number().int().nonnegative(),
});

export type PluginBadge = z.infer<typeof PluginBadge>;

export const PluginStatus = z.object({
  state: z.enum(['not-started', 'running', 'crashed']),
  hanging: z.boolean(),
  error: z.string().nullable(),
});

export type PluginStatus = z.infer<typeof PluginStatus>;

export const PluginFailure = z.object({
  kind: z.enum(['stopped', 'drawing']),
  pluginId: z.string().brand<'PluginId'>(),
  name: z.string(),
  message: z.string(),
  key: z.uuid().brand<'PluginFailureId'>(),
});

export type PluginFailure = z.infer<typeof PluginFailure>;

/*
 * What the App is told when the connected Server's Plugin list changes, such as a Plugin being turned
 * off or on: the App reads the list again rather than drawing a Plugin the Server no longer runs.
 */
export const PluginListChange = z.object({ pluginId: z.string() });

export type PluginListChange = z.infer<typeof PluginListChange>;
