import { z } from 'zod';

const highestPort = 65_535;

// What the Engine sends the Supervisor over the IPC channel.
export const EngineMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ready'),
    port: z.int().min(1).max(highestPort),
  }),
  z.strictObject({ type: z.literal('heartbeat') }),
]);
export type EngineMessage = z.infer<typeof EngineMessage>;
