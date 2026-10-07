import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  createMachine,
  type EventFromLogic,
  fromCallback,
  type InspectionEvent,
  type SnapshotFrom,
} from 'xstate';
import {
  adjacencyMapToArray,
  type DirectedGraphNode,
  getAdjacencyMap,
  getShortestPaths,
  type StatePath,
  TestModel,
  toDirectedGraph,
} from 'xstate/graph';
import {
  inspectorMachine,
  type TransportEvent,
  type TransportInput,
} from './inspector-machine';

let liveTransports = 0;
let actor: Actor<typeof machine> | undefined;
const transport = fromCallback<TransportEvent, TransportInput>(
  ({ receive }) => {
    liveTransports += 1;
    receive(() => {});
    return () => {
      liveTransports -= 1;
    };
  },
);
const machine = inspectorMachine.provide({
  actors: { transport },
  // Two attempts reach both retry branches; the example below checks the production limit of 20.
  guards: { retryAvailable: ({ context }) => context.attempts < 2 },
  actions: { reportUnavailable: () => {} },
});
const input = { port: 8080, processName: 'engine', processId: 1 };
const inspected = createActor(createMachine({}));
const inspection: InspectionEvent = {
  type: '@xstate.actor',
  actorRef: inspected,
  rootId: inspected.sessionId,
};
const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge) => edge.label.text),
  ...node.children.flatMap(eventTypes),
];
const events = [...new Set(eventTypes(toDirectedGraph(machine)))].map<
  EventFromLogic<typeof machine>
>((type) =>
  type === 'inspection.record'
    ? { type, inspection }
    : ({ type } as EventFromLogic<typeof machine>),
);
const stateKey = (snapshot: {
  value: unknown;
  context: { attempts: number };
}) =>
  JSON.stringify({
    value: snapshot.value,
    attempts: snapshot.context.attempts,
  });
const options = {
  input,
  events,
  serializeState: stateKey,
  filterEvents: (
    snapshot: SnapshotFrom<typeof machine>,
    event: AnyEventObject,
  ) => snapshot.status === 'active' && snapshot.can(event as never),
};
const transitions = adjacencyMapToArray(getAdjacencyMap(machine, options));
const paths = getShortestPaths(machine, options);
const transitionKey = (transition: (typeof transitions)[number]) =>
  `${stateKey(transition.state)} ${transition.event.type} ${stateKey(transition.nextState)}`;
const model = new TestModel(machine, options);
// Each per-transition test below adds the path it walked: the shortest path in, then the transition.
const walkedPaths: StatePath<
  SnapshotFrom<typeof machine>,
  EventFromLogic<typeof machine>
>[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  liveTransports = 0;
});
afterEach(() => {
  actor?.stop();
  vi.useRealTimers();
});

it.each(
  transitions.map(
    (transition) => [transitionKey(transition), transition] as const,
  ),
)('walks %s', (_, transition) => {
  const path = paths.find(
    (candidate) => stateKey(candidate.state) === stateKey(transition.state),
  );
  if (!path) throw new Error('No model path reaches the transition');
  actor = createActor(machine, { input }).start();
  for (const step of path.steps.slice(1)) actor.send(step.event as never);
  actor.send(transition.event as never);
  expect(stateKey(actor.getSnapshot())).toBe(stateKey(transition.nextState));
  expect(liveTransports).toBe(actor.getSnapshot().matches('active') ? 1 : 0);
  walkedPaths.push({
    ...path,
    state: transition.nextState,
    steps: [
      ...path.steps,
      { event: transition.event, state: transition.nextState },
    ],
  });
});

it('the model walks every transition', () => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths: walkedPaths,
      stateKey,
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
});

it('waits 500 milliseconds between attempts and stops after 20 failures', () => {
  const actual = inspectorMachine.provide({
    actors: { transport },
    actions: { reportUnavailable: () => {} },
  });
  const inspector = createActor(actual, { input }).start();
  try {
    for (let attempt = 1; attempt <= 20; attempt++) {
      expect(inspector.getSnapshot().context.attempts).toBe(attempt);
      inspector.send({ type: 'transport.failed' });
      vi.advanceTimersByTime(499);
      expect(inspector.getSnapshot().matches('backingOff')).toBe(true);
      vi.advanceTimersByTime(1);
    }
    expect(inspector.getSnapshot().matches('unavailable')).toBe(true);
    expect(liveTransports).toBe(0);
  } finally {
    inspector.stop();
  }
});

it('cancels pending connection and retry timers when stopped', () => {
  actor = createActor(machine, { input }).start();
  vi.advanceTimersByTime(1000);
  expect(actor.getSnapshot().matches('backingOff')).toBe(true);
  actor.send({ type: 'inspection.stop' });
  vi.advanceTimersByTime(10000);
  expect(actor.getSnapshot().matches('stopped')).toBe(true);
  expect(liveTransports).toBe(0);
  expect(actor.getSnapshot().context.attempts).toBe(1);
});
