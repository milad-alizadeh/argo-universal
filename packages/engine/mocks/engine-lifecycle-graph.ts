import type { EventFromLogic } from 'xstate';
import { toDirectedGraph, type DirectedGraphNode } from 'xstate/graph';
import { machine, type EngineSnapshot } from './engine-lifecycle-actors';
import { fixtures, type EngineEvent } from './engine-lifecycle-fixtures';
import { input } from './engine-lifecycle-input';
const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];
// The machine raises `xstate.done.state.*` itself, so the model must not send it.
const events = [...new Set(eventTypes(toDirectedGraph(machine)))]
  .filter((type): boolean => !type.startsWith('xstate.done.state.'))
  .map((type): EngineEvent => {
    const fixture = fixtures.find((event) => event.type === type);
    if (!fixture) throw new Error(`Missing Engine graph fixture for ${type}`);
    return fixture;
  });

const eventStates: Partial<
  Record<EngineEvent['type'], Parameters<EngineSnapshot['matches']>[0]>
> = {
  'xstate.done.actor.openDatabase': 'openingDatabase',
  'xstate.error.actor.openDatabase': 'openingDatabase',
  'xstate.done.actor.recoverAfterRestart': 'recovering',
  'xstate.error.actor.recoverAfterRestart': 'recovering',
  'xstate.done.actor.startHttpServer': { live: 'listening' },
  'xstate.error.actor.startHttpServer': { live: 'listening' },
  'xstate.done.actor.closeHttpServer': { live: { stopping: 'closingHttp' } },
  'xstate.error.actor.closeHttpServer': { live: { stopping: 'closingHttp' } },
  'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp': {
    live: { stopping: 'closingHttp' },
  },
  'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions': {
    live: { stopping: 'stoppingSessions' },
  },
  'xstate.done.actor.closeAcpResources': {
    live: { stopping: 'closingAgents' },
  },
  'xstate.error.actor.closeAcpResources': {
    live: { stopping: 'closingAgents' },
  },
  'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter': {
    live: { stopping: 'drainingWriter' },
  },
  'xstate.after.heartbeatInterval.engine.live.running': { live: 'running' },
};
const canGraphEvent = (
  snapshot: EngineSnapshot,
  event: EngineEvent,
): boolean => {
  const state = eventStates[event.type];
  return state === undefined
    ? canExternalEvent(snapshot, event)
    : snapshot.matches(state);
};

export const options = {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: EngineSnapshot, event: EngineEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Never the handles themselves; `via` gives the heartbeat self-transition its own vertex.
  serializeState: (
    snapshot: EngineSnapshot,
    event: EngineEvent | undefined,
    previous?: EngineSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      database: snapshot.context.database !== null,
      server: snapshot.context.server !== null,
      failure: snapshot.context.failure !== null,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

function isExternalEvent(
  event: EngineEvent,
): event is Extract<EngineEvent, EventFromLogic<typeof machine>> {
  return [
    'engine.stop',
    'xstate.done.actor.sessions',
    'xstate.error.actor.sessions',
    'xstate.done.actor.databaseWriter',
    'xstate.error.actor.databaseWriter',
  ].includes(event.type);
}
function canExternalEvent(
  snapshot: EngineSnapshot,
  event: EngineEvent,
): boolean {
  return isExternalEvent(event) && snapshot.can(event);
}
