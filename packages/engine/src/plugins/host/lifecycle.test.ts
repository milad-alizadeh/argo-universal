import { type Vertex, walkGraph } from '@repo/vitest/model-test';
import { expect, it } from 'vitest';
import {
  getInitialSnapshot,
  getNextSnapshot,
  type SnapshotFrom,
  type EventFromLogic,
} from 'xstate';
import { hostLifecycleMachine } from './lifecycle.machine';

type HostSnapshot = SnapshotFrom<typeof hostLifecycleMachine>;

type HostEvent = EventFromLogic<typeof hostLifecycleMachine>;

const exited = { type: 'host.exited', reason: 'SIGKILL' } as const;

const input = {
  now: (): number => 0,
  start: (): void => {},
  crash: (): void => {},
};

const vertex = (snapshot: HostSnapshot): Vertex => ({
  state: snapshot.value,
  restarts: snapshot.context.restarts,
});

const stateKey = (snapshot: HostSnapshot): string =>
  JSON.stringify(vertex(snapshot));

const { paths, unwalked } = walkGraph(hostLifecycleMachine, {
  input,
  fixtures: [exited, { type: 'host.close' }] satisfies HostEvent[],
  vertex,
  stateKey,
  walks: [
    {
      name: 'shortest path',
      search: 'shortest',
      prefixes: true,
      arrival: (_, event, previous): string =>
        `${stateKey(previous)} ${event.type}`,
    },
  ],
});

it('structurally walks host restart, budget exhaustion and close transitions', () => {
  expect(unwalked()).toEqual([]);
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
