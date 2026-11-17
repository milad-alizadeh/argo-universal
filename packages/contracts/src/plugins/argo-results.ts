import { z } from 'zod';

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
