import { z } from 'zod';

const highestPort = 65_535;

const engineLoad = z.strictObject({
  pid: z.int().positive(),
  sampledAt: z.number(),
  lagMs: z.number().nonnegative(),
  cpuPercent: z.number().nonnegative(),
});

export type EngineLoad = z.infer<typeof engineLoad>;

// What the Engine sends the Supervisor over the IPC channel.
export const EngineMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ready'),
    port: z.int().min(1).max(highestPort),
  }),
  z.strictObject({ type: z.literal('heartbeat'), load: engineLoad.optional() }),
  z.strictObject({ type: z.literal('missed-voice-pong') }),
]);

export type EngineMessage = z.infer<typeof EngineMessage>;

// A closing Supervisor cannot accept diagnostics. Ignore an IPC failure after the connected check.
export function sendEngineMessage(message: EngineMessage): void {
  if (process.connected) process.send?.(message, (): void => {});
}
