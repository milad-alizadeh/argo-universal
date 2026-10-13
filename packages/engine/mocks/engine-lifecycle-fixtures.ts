import type { EventFromLogic, ErrorActorEvent } from 'xstate';
import type { GraphEventFromLogic } from 'xstate/graph';
import { machine } from './engine-lifecycle-actors';
import { stopEngineEvent } from './engine-lifecycle-input';
import { record, mockHttpServer } from './engine-lifecycle-record';
export const openError = new Error('database is locked');
export const recoveryError = new Error('repair failed');
export const listenError = Object.assign(new Error('listen EADDRINUSE'), {
  code: 'EADDRINUSE',
});
export const closeError = new Error('close failed');
// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
export const sessionFailure = {
  type: 'xstate.error.actor.sessions',
  actorId: 'sessions',
  error: new Error('stop failed'),
} satisfies EventFromLogic<typeof machine> & ErrorActorEvent<Error, 'sessions'>;
export const writerFailure = {
  type: 'xstate.error.actor.databaseWriter',
  actorId: 'databaseWriter',
  error: new Error('drain failed'),
} satisfies EventFromLogic<typeof machine> &
  ErrorActorEvent<Error, 'databaseWriter'>;
export const fixtures = [
  {
    type: 'xstate.done.actor.openDatabase',
    actorId: 'openDatabase',
    output: record.mockDatabase,
  },
  {
    type: 'xstate.error.actor.openDatabase',
    actorId: 'openDatabase',
    error: openError,
  },
  {
    type: 'xstate.done.actor.recoverAfterRestart',
    actorId: 'recoverAfterRestart',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.recoverAfterRestart',
    actorId: 'recoverAfterRestart',
    error: recoveryError,
  },
  {
    type: 'xstate.done.actor.startHttpServer',
    actorId: 'startHttpServer',
    output: mockHttpServer,
  },
  {
    type: 'xstate.error.actor.startHttpServer',
    actorId: 'startHttpServer',
    error: listenError,
  },
  {
    type: 'xstate.done.actor.closeHttpServer',
    actorId: 'closeHttpServer',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.closeHttpServer',
    actorId: 'closeHttpServer',
    error: closeError,
  },
  { type: 'xstate.done.actor.sessions' },
  {
    type: 'xstate.done.actor.closeAcpResources',
    actorId: 'closeAcpResources',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.closeAcpResources',
    actorId: 'closeAcpResources',
    error: new Error('cleanup failed'),
  },
  sessionFailure,
  { type: 'xstate.done.actor.databaseWriter' },
  writerFailure,
  { type: stopEngineEvent, reason: 'SIGTERM' },
  { type: 'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp' },
  {
    type: 'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions',
  },
  { type: 'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter' },
  { type: 'xstate.after.heartbeatInterval.engine.live.running' },
] satisfies GraphEventFromLogic<typeof machine>[];
export type EngineEvent = (typeof fixtures)[number];
