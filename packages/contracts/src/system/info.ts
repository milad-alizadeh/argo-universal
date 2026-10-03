import { z } from 'zod';

// Output of `system.info`.
export const SystemInfo = z.strictObject({
  version: z.string(),
  startedAt: z.iso.datetime(),
  pid: z.int(),
});
export type SystemInfo = z.infer<typeof SystemInfo>;
