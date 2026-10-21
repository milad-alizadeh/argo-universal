import { z } from 'zod';
import { AccountCall, OAuthCall } from '#plugin-account-calls';
import { PluginAssetRequest } from '#plugin-assets';
import { WireJson } from '#plugin-wire-json';

// What a Plugin's `argo` calls send to the Server, and what the Server answers.
export const FsWrite = z.object({
  action: z.literal('write'),
  path: z.string(),
  content: z.string(),
});

export const FsCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), path: z.string() }),
  FsWrite,
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
  // Only variables the matching Capability names; the Server adds PATH, HOME, LANG and TMPDIR.
  env: z.record(z.string(), z.string()).optional(),
});

export type ProcessCommand = z.infer<typeof ProcessCommand>;

export const ProcessRun = ProcessCommand.extend({ action: z.literal('run') });

export const ProcessCall = z.discriminatedUnion('action', [
  ProcessRun,
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
  account: z.string().optional(),
});

export type FetchCall = z.infer<typeof FetchCall>;

export const SecretSet = z.object({
  action: z.literal('set'),
  account: z.string(),
  value: z.string(),
});

export const SecretCall = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get'), account: z.string() }),
  SecretSet,
  z.object({ action: z.literal('delete'), account: z.string() }),
]);

export type SecretCall = z.infer<typeof SecretCall>;

export const StorageQuery = z.object({
  sql: z.string(),
  params: z.array(z.union([z.string(), z.number(), z.null()])),
  method: z.enum(['run', 'all', 'get', 'values']),
});

export type StorageQuery = z.infer<typeof StorageQuery>;

export const StorageRead = StorageQuery.extend({
  method: StorageQuery.shape.method.exclude(['run']),
});

// Queries describe only repeatable reads, using the imperative calls' member schemas.
export const PluginQuery = z.discriminatedUnion('api', [
  FetchCall.extend({ api: z.literal('fetch') }),
  ProcessRun.extend({ api: z.literal('process') }),
  z.object({ api: z.literal('storage'), queries: z.array(StorageRead) }),
]);

export type PluginQuery = z.infer<typeof PluginQuery>;

export const PluginDataState = z.object({
  data: WireJson.optional(),
  error: z.string().optional(),
  stale: z.boolean(),
  revision: z.number().int().nonnegative(),
});

export type PluginDataState = z.infer<typeof PluginDataState>;

const dataTarget = z.object({
  api: z.literal('data'),
  viewId: z.string().min(1),
  watchId: z.string().min(1),
});

export const PluginDataRequest = z.discriminatedUnion('action', [
  dataTarget.extend({
    action: z.literal('watch'),
    query: PluginQuery,
    every: z.number().finite().nonnegative().optional(),
  }),
  dataTarget.extend({ action: z.literal('release') }),
  dataTarget.extend({ action: z.literal('refresh') }),
]);

export type PluginDataRequest = z.infer<typeof PluginDataRequest>;

export const PluginNavBadge = z.object({
  api: z.literal('nav'),
  id: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export type PluginNavBadge = z.infer<typeof PluginNavBadge>;

export { serialisePluginQuery } from '#plugin-query-normalisation';

// `get` answers one row, the other methods a list of rows: the shapes Drizzle's sqlite-proxy driver expects.
export const StorageResult = z.object({
  rows: z.array(z.unknown()),
});

export type StorageResult = z.infer<typeof StorageResult>;

export const ProcessResult = z.object({
  exitCode: z.number().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  truncated: z.boolean(),
  timedOut: z.boolean(),
});

export type ProcessResult = z.infer<typeof ProcessResult>;

export const PluginFileKind = z.enum(['directory', 'file']);

export const PluginFileEntry = z.object({
  name: z.string(),
  kind: PluginFileKind,
});

export const PluginFileInfo = z.object({
  kind: PluginFileKind,
  size: z.number(),
  modified: z.number(),
});

// The body as the Server read it, capped at its limit.
export const FetchReply = z.object({
  ok: z.boolean(),
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
  truncated: z.boolean(),
});

export type FetchReply = z.infer<typeof FetchReply>;

// What `argo.projects.list` tells a Plugin about each Project.
export const PluginProjectInfo = z.object({
  id: z.string(),
  name: z.string(),
  originUrl: z.string().nullable(),
});

export type PluginProjectInfo = z.infer<typeof PluginProjectInfo>;

// Each `argo` call as it crosses to the Server; the Plugin host adds Hooks, views and dispatch results.
export const ArgoRequest = z.discriminatedUnion('api', [
  z.object({ api: z.literal('accounts'), call: AccountCall }),
  z.object({ api: z.literal('oauth'), call: OAuthCall }),
  PluginAssetRequest,
  PluginDataRequest,
  PluginNavBadge,
  z.object({ api: z.literal('storage'), queries: z.array(StorageQuery) }),
  z.object({ api: z.literal('projects'), action: z.literal('list') }),
  z.object({ api: z.literal('secrets'), call: SecretCall }),
  z.object({ api: z.literal('settings'), key: z.string() }),
  z.object({ api: z.literal('fs'), call: FsCall }),
  z.object({ api: z.literal('process'), call: ProcessCall }),
  z.object({ api: z.literal('fetch'), call: FetchCall }),
]);
