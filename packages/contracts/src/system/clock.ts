import { z } from 'zod';

// One value that the `system.clock` subscription sends every second.
export const ClockTick = z.strictObject({
  now: z.iso.datetime(),
});
export type ClockTick = z.infer<typeof ClockTick>;
