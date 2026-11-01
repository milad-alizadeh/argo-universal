import type { ServerAddress } from '@repo/contracts';
import type { DelayEvent, Vertex } from '@repo/vitest/model-test';
import {
  readStoredDoneEvent,
  type ServerEvent,
} from './server-machine-model-events.mocks';
import {
  retryServerEvent,
  type ServerSnapshot,
  staleAddress,
} from './server-machine.mocks';

// Never the address itself, only whose it is.
export const vertex = (snapshot: ServerSnapshot): Vertex => ({
  value: snapshot.value,
  address: snapshot.context.address?.pid ?? null,
  ownedPid: snapshot.context.ownedPid,
  failure: snapshot.context.failure !== null,
  running: snapshot.context.running,
  keepRunning: snapshot.context.keepRunning,
});

// A stale server.json only matters while the spawned Supervisor answers.
export const permitsStaleAddress = (
  snapshot: ServerSnapshot,
  event: ServerEvent | DelayEvent,
): boolean =>
  !('output' in event && event.output === staleAddress) ||
  snapshot.matches({ starting: { answering: 'checking' } });

// A walk with the polling loops gives thousands of simple paths, so the counts are left to the shortest ones. Try again from `ready` leads back to `locating`, and that cycle multiplies them again; the shortest paths still walk it.
const isCountsEvent = (event: ServerEvent | DelayEvent): boolean =>
  ['counts.', 'keepRunning.'].some((prefix) => event.type.startsWith(prefix));

export const ignoresCountsAndRetryFromReady = (
  snapshot: ServerSnapshot,
  event: ServerEvent | DelayEvent,
): boolean =>
  !isCountsEvent(event) &&
  !(event.type === retryServerEvent && snapshot.matches('ready'));

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

const storedLabel = (stored: boolean): string =>
  stored ? 'stored on' : 'stored off';

export const label = (event: ServerEvent | DelayEvent): string | undefined => {
  if (event.type === readStoredDoneEvent) return storedLabel(event.output);

  return 'output' in event ? outputLabel(event.output) : undefined;
};
