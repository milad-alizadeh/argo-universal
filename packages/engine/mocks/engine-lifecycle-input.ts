import { randomUUID } from 'node:crypto';
export const stopAllSessionsEvent = 'sessions.stopAll';
export const drainWriterEvent = 'writer.drain';
export const stopEngineEvent = 'engine.stop';

// The Engine sends a heartbeat every second.
export const heartbeatIntervalMs = 1000;

export const input = {
  now: (): number => Date.now(),
  createId: randomUUID,
  home: '/unused',
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  // No Agents, so the open Sessions machine never probes a real CLI.
  adapters: [],
};
