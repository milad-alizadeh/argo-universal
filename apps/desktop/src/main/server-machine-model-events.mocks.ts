import type { ServerAddress } from '@repo/contracts';
import type { GraphEventFromLogic } from '@repo/vitest/model-graph';
import { type DirectedGraphNode, toDirectedGraph } from 'xstate/graph';
import { readError } from './server-machine-data.mocks';
import {
  acceptsAddress,
  acceptsRunning,
} from './server-machine-model-checks.mocks';
import {
  countsChangedEvent,
  exitReason,
  machine,
  quitDoneEvent,
  quitErrorEvent,
  retryServerEvent,
  runningAddress,
  type ServerSnapshot,
  spawnedAt,
  staleAddress,
  startedAddress,
  supervisorExitedEvent,
  supervisorSpawnedEvent,
} from './server-machine.mocks';

export { readError } from './server-machine-data.mocks';

export const readAddressDoneEvent = 'xstate.done.actor.readAddress';

export const readAddressErrorEvent = 'xstate.error.actor.readAddress';

export const checkRunningDoneEvent = 'xstate.done.actor.checkRunning';

// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const fixtures = [
  ...[runningAddress, null, startedAddress, staleAddress].map(
    (output) =>
      ({
        type: readAddressDoneEvent,
        output,
        actorId: 'readAddress',
      }) as const,
  ),
  {
    type: readAddressErrorEvent,
    error: readError,
    actorId: 'readAddress',
  },
  ...[true, false].map(
    (output) =>
      ({
        type: checkRunningDoneEvent,
        output,
        actorId: 'checkRunning',
      }) as const,
  ),
  { type: supervisorSpawnedEvent, pid: startedAddress.pid, at: spawnedAt },
  { type: supervisorExitedEvent, reason: exitReason },
  { type: retryServerEvent },
  { type: 'app.quit' },
  { type: countsChangedEvent, counts: { running: 2, attention: 1 } },
  { type: countsChangedEvent, counts: { running: 0, attention: 0 } },
  { type: countsChangedEvent, counts: { running: 0, attention: 3 } },
  { type: 'counts.disconnected' },
  { type: quitDoneEvent, actorId: 'askQuit', output: true },
  { type: quitDoneEvent, actorId: 'askQuit', output: false },
  {
    type: quitErrorEvent,
    actorId: 'askQuit',
    error: readError,
  },
  {
    type: 'xstate.after.pollDelay.serverConnection.starting.answering.waiting',
  },
  { type: 'xstate.after.pollDelay.serverConnection.abandoning.waiting' },
  { type: 'xstate.after.pollDelay.serverConnection.retrying.waiting' },
  { type: 'xstate.after.pollDelay.serverConnection.stopping.waiting' },
  { type: 'xstate.after.startLimit.serverConnection.starting.answering' },
  { type: 'xstate.after.stopLimit.serverConnection.abandoning' },
  { type: 'xstate.after.stopLimit.serverConnection.retrying' },
  { type: 'xstate.after.stopLimit.serverConnection.stopping' },
] satisfies GraphEventFromLogic<typeof machine>[];

export type ServerEvent = (typeof fixtures)[number];

const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];

export const types = [...new Set(eventTypes(toDirectedGraph(machine)))];

export const events = types.flatMap((type): ServerEvent[] => {
  const matching = fixtures.filter((event) => event.type === type);

  if (!matching.length)
    throw new Error(`Missing Server graph fixture for ${type}`);

  return matching;
});

export const output = (
  event: ServerEvent,
): ServerAddress | null | boolean | undefined =>
  'output' in event ? event.output : undefined;

interface GraphChecks {
  [event: string]: (snapshot: ServerSnapshot) => boolean;
}

const graphChecks: GraphChecks = {
  [quitDoneEvent]: (snapshot) => snapshot.matches({ ready: 'confirming' }),
  [quitErrorEvent]: (snapshot) => snapshot.matches({ ready: 'confirming' }),
  [readAddressDoneEvent]: acceptsAddress,
  [readAddressErrorEvent]: acceptsAddress,
  [checkRunningDoneEvent]: acceptsRunning,
  'xstate.after.pollDelay.serverConnection.starting.answering.waiting': (
    snapshot,
  ) => snapshot.matches({ starting: { answering: 'waiting' } }),
  'xstate.after.pollDelay.serverConnection.abandoning.waiting': (snapshot) =>
    snapshot.matches({ abandoning: 'waiting' }),
  'xstate.after.pollDelay.serverConnection.retrying.waiting': (snapshot) =>
    snapshot.matches({ retrying: 'waiting' }),
  'xstate.after.pollDelay.serverConnection.stopping.waiting': (snapshot) =>
    snapshot.matches({ stopping: 'waiting' }),
  'xstate.after.startLimit.serverConnection.starting.answering': (snapshot) =>
    snapshot.matches({ starting: 'answering' }),
  'xstate.after.stopLimit.serverConnection.abandoning': (snapshot) =>
    snapshot.matches('abandoning'),
  'xstate.after.stopLimit.serverConnection.retrying': (snapshot) =>
    snapshot.matches('retrying'),
  'xstate.after.stopLimit.serverConnection.stopping': (snapshot) =>
    snapshot.matches('stopping'),
};

type PublicEvent = Extract<
  ServerEvent,
  {
    type:
      | 'server.spawned'
      | 'server.exited'
      | 'server.retry'
      | 'app.quit'
      | 'counts.changed'
      | 'counts.disconnected';
  }
>;

function isPublicEvent(event: ServerEvent): event is PublicEvent {
  return !event.type.startsWith('xstate.');
}

export function canGraphEvent(
  snapshot: ServerSnapshot,
  event: ServerEvent,
): boolean {
  if (isPublicEvent(event)) return snapshot.can(event);
  const check = graphChecks[event.type];

  if (!check) throw new Error(`Missing Server graph check for ${event.type}`);

  return check(snapshot);
}
