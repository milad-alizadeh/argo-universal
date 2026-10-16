import { z } from 'zod';

// What a Plugin's `argo.fs`, `argo.process` and `argo.fetch` calls send to the Server.
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
