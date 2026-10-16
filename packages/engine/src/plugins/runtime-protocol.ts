import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { z } from 'zod';
import { StorageQuery, StorageResult } from './storage.ts';

export { PluginStatus } from '@repo/contracts/plugins/runtime';

export const pluginAnswerLimitMs = 3000;

export const PluginEntry = z.object({
  pluginId: z.string(),
  directory: z.string(),
  main: z.string(),
  generation: z.number().int().nonnegative(),
  source: z.string().optional(),
});

export type PluginEntry = z.infer<typeof PluginEntry>;

export const SecretCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get'), account: z.string() }),
  z.object({
    action: z.literal('set'),
    account: z.string(),
    value: z.string(),
  }),
  z.object({ action: z.literal('delete'), account: z.string() }),
]);

export type SecretCall = z.infer<typeof SecretCall>;

export const PluginRequest = z.discriminatedUnion('api', [
  z.object({ api: z.literal('storage'), queries: z.array(StorageQuery) }),
  z.object({ api: z.literal('secrets'), call: SecretCall }),
]);

export type PluginRequest = z.infer<typeof PluginRequest>;

export const PluginValue = z
  .union([z.array(StorageResult), z.string(), z.null()])
  .optional();

export type PluginValue = z.infer<typeof PluginValue>;

export const PluginReply = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: PluginValue }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export type PluginReply = z.infer<typeof PluginReply>;

export const HostCommand = z.discriminatedUnion('type', [
  PluginEntry.extend({ type: z.literal('activate') }),
  z.object({ type: z.literal('stop'), pluginId: z.string() }),
  z.object({
    type: z.literal('reply'),
    pluginId: z.string(),
    generation: z.number(),
    id: z.number(),
    reply: PluginReply,
  }),
]);

export type HostReply = Extract<z.infer<typeof HostCommand>, { type: 'reply' }>;

export const HostMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  PluginStatus.extend({
    type: z.literal('status'),
    pluginId: z.string(),
    generation: z.number(),
  }),
  z.object({
    type: z.literal('call'),
    pluginId: z.string(),
    generation: z.number(),
    id: z.number(),
    request: PluginRequest,
  }),
]);

export type HostMessage = z.infer<typeof HostMessage>;

export const WorkerCall = z.object({
  type: z.literal('call'),
  id: z.number(),
  request: PluginRequest,
});

export type WorkerCall = z.infer<typeof WorkerCall>;

export const WorkerMessage = z.union([z.enum(['ready', 'pong']), WorkerCall]);

export const WorkerReply = z.object({
  type: z.literal('reply'),
  id: z.number(),
  reply: PluginReply,
});

export type WorkerReply = z.infer<typeof WorkerReply>;

export const WorkerCommand = z.union([z.literal('ping'), WorkerReply]);

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
