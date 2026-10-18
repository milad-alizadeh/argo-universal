import {
  FetchCall,
  FsCall,
  ProcessCall,
} from '@repo/contracts/plugins/argo-calls';
import {
  HookCall,
  HookInvocation,
} from '@repo/contracts/plugins/hook-protocol';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import { PluginEvent, ViewMessage } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

export { PluginStatus } from '@repo/contracts/plugins/runtime';

export type { PluginEvent } from '@repo/contracts/plugins/wire';

export {
  FetchCall,
  FsCall,
  ProcessCall,
  ProcessCommand,
} from '@repo/contracts/plugins/argo-calls';

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

export const PluginRequest = z.discriminatedUnion('api', [
  z.object({ api: z.literal('hooks'), call: HookCall }),
  z.object({ api: z.literal('storage'), queries: z.array(StorageQuery) }),
  z.object({ api: z.literal('secrets'), call: SecretCall }),
  z.object({ api: z.literal('fs'), call: FsCall }),
  z.object({ api: z.literal('process'), call: ProcessCall }),
  z.object({ api: z.literal('fetch'), call: FetchCall }),
  z.object({
    api: z.literal('view'),
    path: z.string(),
    message: ViewMessage,
  }),
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
    type: z.literal('event'),
    pluginId: z.string(),
    event: PluginEvent,
  }),
  z.object({
    type: z.literal('reply'),
    pluginId: z.string(),
    generation: z.number(),
    id: z.number(),
    reply: PluginReply,
  }),
  HookInvocation.extend({
    type: z.literal('hook'),
    pluginId: z.string(),
    generation: z.number(),
  }),
]);

export type HostCommand = z.infer<typeof HostCommand>;

export type HostReply = Extract<z.infer<typeof HostCommand>, { type: 'reply' }>;

export type HostEvent = Extract<z.infer<typeof HostCommand>, { type: 'event' }>;

export type HostHook = Extract<HostCommand, { type: 'hook' }>;

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

const WorkerEvent = z.object({
  type: z.literal('event'),
  event: PluginEvent,
});

const WorkerHook = HookInvocation.extend({ type: z.literal('hook') });

export const WorkerCommand = z.union([
  z.literal('ping'),
  WorkerReply,
  WorkerEvent,
  WorkerHook,
]);

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

export type WorkerCommand = z.infer<typeof WorkerCommand>;
