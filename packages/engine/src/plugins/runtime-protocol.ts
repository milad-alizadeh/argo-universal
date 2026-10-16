import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { z } from 'zod';

export { PluginStatus } from '@repo/contracts/plugins/runtime';

export const StorageQuery = z.object({
  sql: z.string(),
  params: z.array(z.union([z.string(), z.number(), z.null()])),
  method: z.enum(['run', 'all', 'get', 'values']),
});

export type StorageQuery = z.infer<typeof StorageQuery>;

// `get` answers one row, the other methods a list of rows: the shapes Drizzle's sqlite-proxy driver expects.
export const StorageResult = z.object({
  rows: z.array(z.unknown()),
});

export type StorageResult = z.infer<typeof StorageResult>;

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

export const FsCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), path: z.string() }),
  z.object({
    action: z.literal('write'),
    path: z.string(),
    content: z.string(),
  }),
  z.object({ action: z.literal('list'), path: z.string() }),
  z.object({ action: z.literal('stat'), path: z.string() }),
]);

export type FsCall = z.infer<typeof FsCall>;

// A command is its argv; there is no shell to interpret it.
export const ProcessCommand = z.object({
  argv: z.array(z.string()).min(1),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  input: z.string().optional(),
});

export type ProcessCommand = z.infer<typeof ProcessCommand>;

export const ProcessCall = z.discriminatedUnion('action', [
  ProcessCommand.extend({ action: z.literal('run') }),
  ProcessCommand.extend({ action: z.literal('spawn') }),
  z.object({ action: z.literal('wait'), id: z.string() }),
  z.object({ action: z.literal('kill'), id: z.string() }),
]);

export type ProcessCall = z.infer<typeof ProcessCall>;

export const FetchCall = z.object({
  url: z.string(),
  method: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});

export type FetchCall = z.infer<typeof FetchCall>;

export const PluginRequest = z.discriminatedUnion('api', [
  z.object({ api: z.literal('storage'), queries: z.array(StorageQuery) }),
  z.object({ api: z.literal('secrets'), call: SecretCall }),
  z.object({ api: z.literal('fs'), call: FsCall }),
  z.object({ api: z.literal('process'), call: ProcessCall }),
  z.object({ api: z.literal('fetch'), call: FetchCall }),
]);

export type PluginRequest = z.infer<typeof PluginRequest>;

// Every answer to a Plugin crosses as JSON text, so it is JSON.
export const PluginValue = z
  .union([z.json(), z.array(StorageResult)])
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
