import type { ServerAddress } from '@repo/contracts';
import type { DelayEvent, Vertex } from '@repo/vitest/model-test';
import type { ServerEvent } from './server-machine-model-events.mocks';
import { type ServerSnapshot, staleAddress } from './server-machine.mocks';

// Never the address itself, only whose it is.
export const vertex = (snapshot: ServerSnapshot): Vertex => ({
  value: snapshot.value,
  address: snapshot.context.address?.pid ?? null,
  ownedPid: snapshot.context.ownedPid,
  failure: snapshot.context.failure !== null,
  running: snapshot.context.running,
});

// A stale server.json only matters while the spawned Supervisor answers.
export const permitsStaleAddress = (
  snapshot: ServerSnapshot,
  event: ServerEvent | DelayEvent,
): boolean =>
  !('output' in event && event.output === staleAddress) ||
  snapshot.matches({ starting: { answering: 'checking' } });

// A walk with the polling loops gives thousands of simple paths, so the counts are left to the shortest ones.
export const ignoresCounts = (
  _: ServerSnapshot,
  event: ServerEvent | DelayEvent,
): boolean => !event.type.startsWith('counts.');

// Labels what an event carries, so its path reads without the data.
const addressLabel = (value: { pid: number } | null | undefined): string => {
  if (value === staleAddress) return 'stale pid 200';

  return value == null ? 'none' : `pid ${value.pid}`;
};

const outputLabel = (
  output: ServerAddress | boolean | null | undefined,
): string => {
  if (typeof output === 'boolean') return output ? 'running' : 'exited';

  return addressLabel(output);
};

export const label = (event: ServerEvent | DelayEvent): string | undefined =>
  'output' in event ? outputLabel(event.output) : undefined;
