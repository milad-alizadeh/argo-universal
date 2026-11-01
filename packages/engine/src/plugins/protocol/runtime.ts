import { AccountInvocation } from '@repo/contracts/plugins/account-calls';
import {
  ArgoRequest,
  FetchCall,
  FsCall,
  ProcessCall,
  ProcessCommand,
  SecretCall,
  StorageQuery,
  StorageResult,
} from '@repo/contracts/plugins/argo-calls';
import {
  HookCall,
  HookWaiting,
  HostHookCommand,
  WorkerHookCommand,
} from '@repo/contracts/plugins/hook-protocol';
import { PluginOperationCall } from '@repo/contracts/plugins/plugin-operations';
import { PluginStatus } from '@repo/contracts/plugins/runtime';
import * as wire from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { PluginEntry } from '#plugin-entry';
import { TestCommand, TestReply } from '#plugin-test-control';

export { PluginEntry } from '#plugin-entry';

export { PluginStatus } from '@repo/contracts/plugins/runtime';

export type { PluginEvent } from '@repo/contracts/plugins/wire';

export {
  FetchCall,
  FsCall,
  ProcessCall,
  ProcessCommand,
  SecretCall,
  StorageQuery,
  StorageResult,
};

export const pluginAnswerLimitMs = 3000;

export const PluginRequest = z.discriminatedUnion('api', [
  ...ArgoRequest.options,
  z.object({ api: z.literal('hooks'), call: HookCall }),
  z.object({
    api: z.literal('dispatchResult'),
    requestId: wire.PluginDispatchId,
    result: wire.PluginDispatchResult,
  }),
  z.object({ api: z.literal('operations'), call: PluginOperationCall }),
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
  z.object({
    ok: z.literal(false),
    error: z.string(),
    // Set when the Capability checker refused the call, so a reader never parses the message.
    refused: z.boolean().optional(),
  }),
]);

export type PluginReply = z.infer<typeof PluginReply>;

export const HostCommand = z.discriminatedUnion('type', [
  AccountInvocation.extend({ pluginId: z.string(), generation: z.number() }),
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

export type HostDelivery = Extract<
  HostCommand,
  { type: 'reply' | 'hook' | 'accountToken' }
>;

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
    viewId: z.string().optional(),
    projectId: z.string().optional(),
    generation: z.number(),
    id: z.number(),
    request: PluginRequest,
  }),
]);

export type HostMessage = z.infer<typeof HostMessage>;

export const WorkerCall = z.object({
  type: z.literal('call'),
  viewId: z.string().optional(),
  projectId: z.string().optional(),
  id: z.number(),
  request: PluginRequest,
});

export type WorkerCall = z.infer<typeof WorkerCall>;

export const WorkerMessage = z.union([
  z.enum(['alive', 'executing', 'ready', 'pong']),
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
  AccountInvocation,
  z.literal('ping'),
  WorkerReply,
  WorkerEvent,
  WorkerHookCommand,
  TestCommand,
]);

export {
  notStarted,
  crashed,
  running,
  runtimeError,
} from '#plugin-runtime-status';

export type WorkerCommand = z.infer<typeof WorkerCommand>;
