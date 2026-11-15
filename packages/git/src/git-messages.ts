import { z } from 'zod';

// What the git process is asked: run one command, or stop one it is running.
export const GitRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run'),
    id: z.number(),
    directory: z.string(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string().optional()),
  }),
  z.object({ type: z.literal('abort'), id: z.number() }),
]);

export type GitRequest = z.infer<typeof GitRequest>;

// What `execFile` puts on its error, kept as plain data because a message between processes drops an Error's own fields.
export const GitFailure = z.object({
  name: z.string(),
  message: z.string(),
  code: z.union([z.number(), z.string()]).nullish().default(null),
  signal: z.string().nullish().default(null),
  killed: z.boolean().default(false),
  cmd: z.string().default(''),
  stdout: z.string().default(''),
  stderr: z.string().default(''),
});

export type GitFailure = z.infer<typeof GitFailure>;

export const GitReply = z.union([
  z.object({ id: z.number(), stdout: z.string() }),
  z.object({ id: z.number(), failure: GitFailure }),
]);

export type GitReply = z.infer<typeof GitReply>;
