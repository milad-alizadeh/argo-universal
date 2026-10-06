import { z } from 'zod';

// Output of `system.info`.
export const SystemInfo = z.strictObject({
  version: z.string(),
  startedAt: z.iso.datetime(),
  pid: z.int(),
  // The Server computer's name, for "Start the Session in".
  name: z.string(),
});
export type SystemInfo = z.infer<typeof SystemInfo>;
