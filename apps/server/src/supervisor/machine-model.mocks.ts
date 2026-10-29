import { type GraphEventFromLogic } from '@repo/vitest/model-graph';
import { beforeEach } from 'vitest';
import { type SnapshotFrom } from 'xstate';
import { type DirectedGraphNode, toDirectedGraph } from 'xstate/graph';
import { supervisorMachine } from './machine';
import {
  createMockEngine,
  supervisorStartedAt,
  readyEngineEvent,
  engineExitedEvent,
  heartbeatEngineEvent,
  engineStoppedEvent,
  engineUnresolvedEvent,
  stopServerEvent,
  readyDelayEvent,
  heartbeatDelayEvent,
  backoffDelayEvent,
} from './machine-fixture.mocks';

export let serverAddressWrites: unknown[];

export let serverAddressRemovals: number;

export const machine = supervisorMachine.provide({
  actors: { engine: createMockEngine({ exitsWhenAsked: false }) },
  actions: {
    writeServerAddress: ({ context }): void => {
      serverAddressWrites.push({
        port: context.port,
        version: context.version,
        startedAt: context.startedAt,
      });
    },
    removeServerAddress: (): void => {
      serverAddressRemovals += 1;
    },
  },
});

export type SupervisorSnapshot = SnapshotFrom<typeof machine>;

export const input = {
  now: (): number => 1000,
  home: '/unused',
  version: '1.2.3',
  startedAt: supervisorStartedAt,
  watch: false,
};

const fixtures = [
  { type: readyEngineEvent, port: 7337 },
  { type: engineExitedEvent, code: 1 },
  { type: heartbeatEngineEvent },
  { type: engineStoppedEvent },
  { type: engineUnresolvedEvent },
  { type: stopServerEvent },
  { type: readyDelayEvent },
  { type: heartbeatDelayEvent },
  { type: backoffDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];

export type SupervisorEvent = (typeof fixtures)[number];

const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];

// The machine raises `xstate.done.state.*` itself, so the model must not send it.
const events = [...new Set(eventTypes(toDirectedGraph(machine)))].flatMap(
  (type): SupervisorEvent[] => {
    if (type.startsWith('xstate.done.state.')) return [];
    const fixture = fixtures.find((event) => event.type === type);

    if (!fixture)
      throw new Error(`Missing Supervisor graph fixture for ${type}`);

    return [fixture];
  },
);

const canGraphEvent = (
  snapshot: SupervisorSnapshot,
  event: SupervisorEvent,
): boolean => {
  switch (event.type) {
    case readyDelayEvent:
      return snapshot.matches('starting');
    case heartbeatDelayEvent:
      return snapshot.matches('running');
    default:
      return canOtherEvent(snapshot, event);
  }
};

const canOtherEvent = (
  snapshot: SupervisorSnapshot,
  event: Exclude<
    SupervisorEvent,
    { type: typeof readyDelayEvent | typeof heartbeatDelayEvent }
  >,
): boolean =>
  event.type === backoffDelayEvent
    ? snapshot.matches({ backingOff: { delay: 'waiting' } })
    : snapshot.can(event);

export const options = {
  input,
  events,
  limit: 10_000,
  // A done actor ignores events, but traversal still leaves a final state through the root `on`.
  filterEvents: (
    snapshot: SupervisorSnapshot,
    event: SupervisorEvent,
  ): boolean => snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Crash count, not crash times; `via` gives self-transitions their own vertex.
  serializeState: (
    snapshot: SupervisorSnapshot,
    event: SupervisorEvent | undefined,
    previous?: SupervisorSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      port: snapshot.context.port,
      crashes: snapshot.context.crashTimes.length,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

beforeEach((): void => {
  serverAddressWrites = [];
  serverAddressRemovals = 0;
});
