import { z } from 'zod';

export const SessionCounts = z.strictObject({
  attention: z.int(),
  running: z.int(),
});
export type SessionCounts = z.infer<typeof SessionCounts>;
