import { z } from 'zod';

export const pluginAnswerLimitMs = 3000;

export const PluginEntry = z.object({
  pluginId: z.string(),
  directory: z.string(),
  main: z.string(),
  generation: z.number().int().nonnegative(),
  source: z.string().optional(),
});

export type PluginEntry = z.infer<typeof PluginEntry>;

export const HostCommand = z.discriminatedUnion('type', [
  PluginEntry.extend({ type: z.literal('activate') }),
  z.object({ type: z.literal('stop'), pluginId: z.string() }),
]);

export const PluginStatus = z.object({
  state: z.enum(['not-started', 'running', 'crashed']),
  hanging: z.boolean(),
  error: z.string().nullable(),
});

export type PluginStatus = z.infer<typeof PluginStatus>;

export const HostMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  PluginStatus.extend({
    type: z.literal('status'),
    pluginId: z.string(),
    generation: z.number(),
  }),
]);

export type HostMessage = z.infer<typeof HostMessage>;

export const WorkerMessage = z.enum(['ready', 'pong']);

export const notStarted: PluginStatus = {
  state: 'not-started',
  hanging: false,
  error: null,
};

export const running: PluginStatus = {
  state: 'running',
  hanging: false,
  error: null,
};

export const runtimeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
