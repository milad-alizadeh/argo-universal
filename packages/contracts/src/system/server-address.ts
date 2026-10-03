import { z } from 'zod';

// The content of `~/.argo/server.json`, which the supervisor writes.
export const ServerAddress = z.strictObject({
  pid: z.int().positive(),
  port: z.int().min(1).max(65535),
  version: z.string().min(1),
  startedAt: z.iso.datetime(),
});
export type ServerAddress = z.infer<typeof ServerAddress>;
