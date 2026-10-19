import {
  FetchCall,
  FsCall,
  ProcessCall,
  ProcessCommand,
} from '@repo/contracts/plugins/argo-calls';
import { PluginAssetRequest } from '@repo/contracts/plugins/assets';
import {
  HookCall,
  HookWaiting,
  HostHookCommand,
  WorkerHookCommand,
} from '@repo/contracts/plugins/hook-protocol';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import * as wire from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { PluginEntry } from '#plugin-entry';
import { TestCommand, TestReply } from '#plugin-test-control';

export { PluginEntry } from '#plugin-entry';

export { PluginStatus } from '@repo/contracts/plugins/runtime';

export type { PluginEvent } from '@repo/contracts/plugins/wire';

export { FetchCall, FsCall, ProcessCall, ProcessCommand };

export { StorageQuery, StorageResult } from '#plugin-storage-protocol';

import { StorageQuery, StorageResult } from '#plugin-storage-protocol';

export const pluginAnswerLimitMs = 3000;

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
  PluginAssetRequest,
  z.object({ api: z.literal('hooks'), call: HookCall }),
  z.object({ api: z.literal('storage'), queries: z.array(StorageQuery) }),
  z.object({ api: z.literal('projects'), action: z.literal('list') }),
  z.object({ api: z.literal('secrets'), call: SecretCall }),
  z.object({ api: z.literal('settings'), key: z.string() }),
  z.object({ api: z.literal('fs'), call: FsCall }),
  z.object({ api: z.literal('process'), call: ProcessCall }),
  z.object({ api: z.literal('fetch'), call: FetchCall }),
  z.object({
    api: z.literal('dispatchResult'),
    requestId: wire.PluginDispatchId,
    result: wire.PluginDispatchResult,
  }),
  z.object({
    api: z.literal('view'),
    viewId: wire.PluginViewId,
    message: wire.ViewMessage,
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
  TestCommand.extend({ pluginId: z.string() }),
  z.object({ type: z.literal('stop'), pluginId: z.string() }),
  HookWaiting,
  z.object({
    type: z.literal('event'),
    pluginId: z.string(),
    event: wire.PluginEvent,
  }),
  z.object({
    type: z.literal('reply'),
    pluginId: z.string(),
    generation: z.number(),
    id: z.number(),
    reply: PluginReply,
  }),
  HostHookCommand,
]);

export type HostCommand = z.infer<typeof HostCommand>;

export type HostReply = Extract<z.infer<typeof HostCommand>, { type: 'reply' }>;

export type HostEvent = Extract<z.infer<typeof HostCommand>, { type: 'event' }>;

export type HostHook = Extract<HostCommand, { type: 'hook' }>;

export type HostWaiting = Extract<HostCommand, { type: 'waiting' }>;

export const HostMessage = z.discriminatedUnion('type', [
  TestReply.extend({ pluginId: z.string(), generation: z.number() }),
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

export const WorkerMessage = z.union([
  z.enum(['ready', 'pong']),
  WorkerCall,
  TestReply,
]);

export const WorkerReply = z.object({
  type: z.literal('reply'),
  id: z.number(),
  reply: PluginReply,
});

export type WorkerReply = z.infer<typeof WorkerReply>;

const WorkerEvent = z.object({
  type: z.literal('event'),
  event: wire.PluginEvent,
});

export const WorkerCommand = z.union([
  z.literal('ping'),
  WorkerReply,
  WorkerEvent,
  WorkerHookCommand,
  TestCommand,
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
