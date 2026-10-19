import { z } from 'zod';

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
