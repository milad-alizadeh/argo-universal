import type { GraphEventFromLogic } from '@repo/vitest/model-graph';
import { type DirectedGraphNode, toDirectedGraph } from 'xstate/graph';
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

const fixtures = [
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
  { type: 'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp' },
  {
    type: 'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions',
  },
  { type: 'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter' },
  { type: 'xstate.after.heartbeatInterval.engine.live.running' },
] satisfies GraphEventFromLogic<typeof machine>[];

export type EngineEvent = (typeof fixtures)[number];

const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];

// The machine raises `xstate.done.state.*` itself, so the model must not send it.
export const events = [
  ...new Set(eventTypes(toDirectedGraph(machine))),
].flatMap((type): EngineEvent[] => {
  if (type.startsWith('xstate.done.state.')) return [];
  const fixture = fixtures.find((event) => event.type === type);

  if (!fixture) throw new Error(`Missing Engine graph fixture for ${type}`);

  return [fixture];
});
