import type { ModelFixture } from '@repo/vitest/model-test';
import {
  stopEngineEvent,
  mockHttpServer,
  openError,
  recoveryError,
  listenError,
  closeError,
  sessionFailure,
  writerFailure,
} from './engine-model-fixtures';
import { machine } from './engine-model-logic';
import * as model from './engine-model-state';

// Done and error events of invoked actors are not in the machine's event type, but the model drives them. Its delays need no fixture.
export const fixtures = [
  {
    type: 'xstate.done.actor.openDatabase',
    actorId: 'openDatabase',
    output: model.mockDatabase,
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
] satisfies ModelFixture<typeof machine>[];

export type EngineEvent = (typeof fixtures)[number];
