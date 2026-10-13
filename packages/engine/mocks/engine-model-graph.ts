import type { EventFromLogic } from 'xstate';
import { matchesState } from 'xstate';
import type { engineMachine } from '../src/engine/machine';
import { type EngineEvent, events } from './engine-model-events';
import { input } from './engine-model-fixtures';
import { type EngineSnapshot } from './engine-model-logic';
const closingHttp = 'live.stopping.closingHttp';
const eventStates: Record<string, string> = {
  'xstate.done.actor.openDatabase': 'openingDatabase',
  'xstate.error.actor.openDatabase': 'openingDatabase',
  'xstate.done.actor.recoverAfterRestart': 'recovering',
  'xstate.error.actor.recoverAfterRestart': 'recovering',
  'xstate.done.actor.startHttpServer': 'live.listening',
  'xstate.error.actor.startHttpServer': 'live.listening',
  'xstate.done.actor.closeHttpServer': closingHttp,
  'xstate.error.actor.closeHttpServer': closingHttp,
  'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp':
    'live.stopping.closingHttp',
  'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions':
    'live.stopping.stoppingSessions',
  'xstate.done.actor.closeAcpResources': 'live.stopping.closingAgents',
  'xstate.error.actor.closeAcpResources': 'live.stopping.closingAgents',
  'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter':
    'live.stopping.drainingWriter',
  'xstate.after.heartbeatInterval.engine.live.running': 'live.running',
};
export const canGraphEvent = (
  snapshot: EngineSnapshot,
  event: EngineEvent,
): boolean => {
  const state = eventStates[event.type];
  return state
    ? matchesState(state, snapshot.value)
    : isMachineEvent(event) && snapshot.can(event);
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

const machineEvents = new Set([
  'engine.stop',
  'xstate.done.actor.sessions',
  'xstate.done.actor.databaseWriter',
  'xstate.error.actor.sessions',
  'xstate.error.actor.databaseWriter',
]);
function isMachineEvent(
  event: EngineEvent,
): event is Extract<EngineEvent, EventFromLogic<typeof engineMachine>> {
  return machineEvents.has(event.type);
}
