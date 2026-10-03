import { z } from 'zod';

// Output of `system.info`.
export const SystemInfo = z.strictObject({
  version: z.string().min(1),
  startedAt: z.iso.datetime(),
  pid: z.int().positive(),
});
export type SystemInfo = z.infer<typeof SystemInfo>;
