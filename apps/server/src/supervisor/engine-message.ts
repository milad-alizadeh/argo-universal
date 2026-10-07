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

// Node's watch mode relays the child's module list as `{ 'watch:import': [...] }`.
export const WatchModeMessage = z.record(
  z.string().startsWith('watch:'),
  z.unknown(),
);

// Events that the Engine actor sends to the Supervisor machine; `engine.exited` answers `engine.stop`.
export type EngineEvent =
  | { type: 'engine.ready'; port: number }
  | { type: 'engine.heartbeat' }
  | { type: 'engine.exit'; code: number | null }
  | { type: 'engine.exited' };

// The event that the Supervisor machine sends the Engine actor.
export type EngineCommand = { type: 'engine.stop' };
