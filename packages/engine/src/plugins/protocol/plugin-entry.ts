import { z } from 'zod';

export const PluginEntry = z.object({
  pluginId: z.string(),
  directory: z.string(),
  main: z.string(),
  generation: z.number().int().nonnegative(),
  source: z.string().optional(),
  clockStart: z.number().finite().optional(),
  backgroundPath: z.string().optional(),
});

export type PluginEntry = z.infer<typeof PluginEntry>;
