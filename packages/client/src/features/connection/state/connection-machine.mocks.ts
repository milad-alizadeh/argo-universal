import { vi } from 'vitest';
import {
  type Actor,
  type ActorOptions,
  type AnyEventObject,
  createActor,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import { createConnectionInput } from './connection-input.mocks';
import { connectionMachine } from './machine';

interface ConnectionHarness {
  watcher: { send: (event: AnyEventObject) => void; live: boolean };
  refetches: number;
  allowedAttempts: number;
  started: Actor<typeof connectionMachine>[];
}

export const lostError = new Error('WebSocket closed');

export const harness: ConnectionHarness = {
  watcher: { send: (): void => {}, live: false },
  refetches: 0,
  allowedAttempts: 0,
  started: [],
};

export const machine = connectionMachine.provide({
  actors: {
    watchConnectionState: fromCallback(({ sendBack }) => {
      const watching = { send: sendBack, live: true };
      harness.watcher = watching;
      return (): void => {
        watching.live = false;
      };
    }),
  },
  actions: {
    refetchAfterReconnect: () => {
      harness.refetches += 1;
    },
  },
});
export type ConnectionSnapshot = SnapshotFrom<typeof machine>;
export type ConnectionActor = Actor<typeof machine>;
export type ConnectionClock = NonNullable<
  ActorOptions<typeof machine>['clock']
>;
// The machine reads neither while the watcher and refetch are mocks.
export const input = createConnectionInput();

export const startConnection = (clock?: ConnectionClock): ConnectionActor => {
  const connection = createActor(machine, {
    input,
    ...(clock ? { clock } : {}),
  });
  connection.on('connection.attemptAllowed', () => {
    harness.allowedAttempts += 1;
  });
  harness.started.push(connection);
  return connection.start();
};

export const resetHarness = (): void => {
  harness.refetches = 0;
  harness.allowedAttempts = 0;
};

export const stopConnections = (): void => {
  for (const connection of harness.started.splice(0)) connection.stop();
};

export const linkState = (
  snapshot: ConnectionSnapshot,
): 'open' | 'connecting' | 'reconnecting' | 'offline' => snapshot.value.link;

export const loseOpenConnection = (): void => {
  harness.watcher.send({ type: 'connection.opened' });
  harness.watcher.send({ type: 'connection.lost', error: lostError });
};

// Requests an attempt and returns how long the machine waited before it allowed it.
export const waitForAllowedAttempt = (connection: ConnectionActor): number => {
  const before = harness.allowedAttempts;
  connection.send({ type: 'connection.attemptRequested' });
  let waited = 0;
  while (harness.allowedAttempts === before) {
    if (waited >= 60_000) throw new Error('The attempt was never allowed');
    vi.advanceTimersByTime(100);
    waited += 100;
  }
  return waited;
};
