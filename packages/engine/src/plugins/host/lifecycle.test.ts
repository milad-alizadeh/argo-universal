import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { getAdjacencyMap, getShortestPaths } from '@repo/vitest/model-graph';
import { expect, it } from 'vitest';
import {
  getInitialSnapshot,
  getNextSnapshot,
  type SnapshotFrom,
  type EventFromLogic,
} from 'xstate';
import type { AdjacencyMap } from 'xstate/graph';
import { hostLifecycleMachine } from './lifecycle.machine';

type HostSnapshot = SnapshotFrom<typeof hostLifecycleMachine>;

type HostEvent = EventFromLogic<typeof hostLifecycleMachine>;

const exited = { type: 'host.exited', reason: 'SIGKILL' } as const;

const events: HostEvent[] = [exited, { type: 'host.close' }];

const input = {
  now: (): number => 0,
  start: (): void => {},
  crash: (): void => {},
};

const stateKey = (snapshot: HostSnapshot): string =>
  JSON.stringify({
    state: snapshot.value,
    restarts: snapshot.context.restarts,
  });

const eventKey = (event: (typeof events)[number]): string => event.type;

const options = {
  input,
  events,
  serializeState: (
    snapshot: HostSnapshot,
    event?: (typeof events)[number],
    previous?: HostSnapshot,
  ): string =>
    JSON.stringify({
      state: stateKey(snapshot),
      via: event && `${previous && stateKey(previous)} ${event.type}`,
    }),
  filterEvents: (
    snapshot: HostSnapshot,
    event: (typeof events)[number],
  ): boolean => snapshot.status === 'active' && snapshot.can(event),
};

const paths = getShortestPaths(hostLifecycleMachine, options);

it('structurally walks host restart, budget exhaustion and close transitions', () => {
  const models = [
    {
      paths,
      getAdjacencyMap: (): AdjacencyMap<HostSnapshot, HostEvent> =>
        getAdjacencyMap(hostLifecycleMachine, options),
    },
  ];

  expect(unwalkedTransitions({ models, paths, stateKey, eventKey })).toEqual(
    [],
  );
  expect(paths.some((path) => path.state.matches('exhausted'))).toBe(true);
  expect(paths.some((path) => path.state.matches('closed'))).toBe(true);
});

it.each([
  { elapsed: 299_999, state: 'exhausted' },
  { elapsed: 300_000, state: 'running' },
])(
  'expires restart attempts at five minutes: $elapsed milliseconds',
  ({ elapsed, state }) => {
    let now = 0;

    let snapshot = getInitialSnapshot(hostLifecycleMachine, {
      ...input,
      now: (): number => now,
    });

    for (const reason of ['first', 'second', 'third'])
      snapshot = getNextSnapshot(hostLifecycleMachine, snapshot, {
        ...exited,
        reason,
      });
    now = elapsed;
    snapshot = getNextSnapshot(hostLifecycleMachine, snapshot, exited);

    expect(snapshot.value).toBe(state);
  },
);
