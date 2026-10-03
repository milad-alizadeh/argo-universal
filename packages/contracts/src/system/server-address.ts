import { z } from 'zod';

// The content of `~/.argo/server.json`, which the supervisor writes.
export const ServerAddress = z.strictObject({
  pid: z.int(),
  port: z.int(),
  version: z.string(),
  startedAt: z.iso.datetime(),
});
export type ServerAddress = z.infer<typeof ServerAddress>;
