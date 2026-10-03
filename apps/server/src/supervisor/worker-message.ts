import { z } from 'zod';

// What the worker sends the supervisor over the IPC channel.
export const WorkerMessage = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready'), port: z.int().min(1).max(65535) }),
  z.strictObject({ type: z.literal('heartbeat') }),
]);
export type WorkerMessage = z.infer<typeof WorkerMessage>;

// Node's watch mode relays the child's module list as `{ 'watch:import': [...] }`.
export const WatchModeMessage = z.record(
  z.string().startsWith('watch:'),
  z.unknown(),
);

// Events that the worker actor sends to the supervisor machine.
export type WorkerEvent =
  | { type: 'worker.ready'; port: number }
  | { type: 'worker.heartbeat' }
  | { type: 'worker.exit'; code: number | null };
