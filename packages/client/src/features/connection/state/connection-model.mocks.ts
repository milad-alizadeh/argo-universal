import { terminalPaths } from '@repo/vitest/model-paths';
import {
  type DirectedGraphNode,
  type GraphEventFromLogic,
  type StatePath,
  getPathsFromEvents,
  getShortestPaths,
  getSimplePaths,
  toDirectedGraph,
} from 'xstate/graph';
import {
  type ConnectionSnapshot,
  input,
  linkState,
  lostError,
  machine,
} from './connection-machine.mocks';

export const connectionLostEvent = 'connection.lost';
export const connectionOpenedEvent = 'connection.opened';
export const foregroundEvent = 'app.foreground';
export const connectionAttemptEvent = 'connection.attemptRequested';
export const retryDelayEvent =
  'xstate.after.retryDelay.connection.attempt.waiting';
export const offlineDelayEvent =
  'xstate.after.offlineDelay.connection.link.reconnecting';

const fixtures = [
  { type: connectionOpenedEvent },
  { type: connectionLostEvent, error: lostError },
  { type: connectionAttemptEvent },
  { type: foregroundEvent },
  { type: retryDelayEvent },
  { type: offlineDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];
export type ConnectionGraphEvent = (typeof fixtures)[number];
export type ConnectionPath = StatePath<
  ConnectionSnapshot,
  ConnectionGraphEvent
>;

const canGraphEvent = (
  snapshot: ConnectionSnapshot,
  event: ConnectionGraphEvent,
): boolean => {
  switch (event.type) {
    case retryDelayEvent:
      return snapshot.matches({ attempt: 'waiting' });
    case offlineDelayEvent:
      return snapshot.matches({ link: 'reconnecting' });
    default:
      return snapshot.can(event);
  }
};

const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge) => edge.label.text),
  ...node.children.flatMap(eventTypes),
];

const fixtureFor = (type: string): ConnectionGraphEvent => {
  const fixture = fixtures.find((event) => event.type === type);
  if (!fixture) throw new Error(`No fixture for Connection event ${type}`);
  return fixture;
};

const isRetry = (event: ConnectionGraphEvent | undefined): boolean =>
  event?.type.startsWith('xstate.after.retryDelay.') ?? false;

export const options = {
  input,
  events: [...new Set(eventTypes(toDirectedGraph(machine)))].map(fixtureFor),
  filterEvents: canGraphEvent,
  // Only the first attempt is special, so more attempts make no new vertex; `retriedFrom` lets a retry return to a state that a path already passed.
  serializeState: (
    snapshot: ConnectionSnapshot,
    event: ConnectionGraphEvent | undefined,
    previous?: ConnectionSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      attempted: snapshot.context.attempts > 0,
      retriedFrom: isRetry(event) ? previous?.value : undefined,
    }),
};

const shortestPaths = [
  ...terminalPaths(getShortestPaths(machine, options)),
  ...getPathsFromEvents(
    machine,
    [
      { type: connectionAttemptEvent },
      { type: connectionAttemptEvent },
      { type: connectionLostEvent, error: lostError },
    ],
    options,
  ),
];
// Direct paths cover first-connect losses; simple paths cover later reconnect cycles.
const simplePaths = terminalPaths(
  getSimplePaths(machine, {
    ...options,
    filterEvents: (snapshot, event) =>
      canGraphEvent(snapshot, event) &&
      !(
        linkState(snapshot) === 'connecting' &&
        event.type === connectionLostEvent
      ),
  }),
);
export const pathGroups = [
  ['shortest path', shortestPaths],
  ['simple path', simplePaths],
] as const;
export const allPaths = [...shortestPaths, ...simplePaths];

export const title = (path: ConnectionPath): string =>
  path.steps
    .map(({ event }) =>
      event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1'),
    )
    .join(' → ');
