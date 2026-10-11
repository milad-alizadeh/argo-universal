import { createAgentMetadata } from '@repo/mocks/agent';
import {
  assertEvent,
  assign,
  createActor,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  openSessionsMachine,
  createSessionActorInput,
  type SessionData,
  sessionMachine,
} from '../src/sessions';

type ModelContext = SnapshotFrom<typeof openSessionsMachine>['context'];

const session = sessionMachine.provide({
  actors: {
    createCheckout: fromPromise(
      (): Promise<SessionData> => new Promise(() => {}),
    ),
    loadSession: fromPromise((): Promise<SessionData> => new Promise(() => {})),
  },
});

export const createOpenSessionsModelMachine = (
  forGraph: boolean,
): typeof openSessionsMachine =>
  openSessionsMachine.provide({
    actors: { session },
    actions: forGraph
      ? {
          spawnAgentProbes: (): void => {},
          openSession: assign(({ context, event }): Partial<ModelContext> => {
            assertEvent(event, ['sessions.create', 'sessions.open']);
            if (context.sessions[event.sessionId]) return {};
            const actor = createActor(session, {
              id: `session:${event.sessionId}`,
              input: createSessionActorInput({ context, event }),
            });
            return {
              sessions: { ...context.sessions, [event.sessionId]: actor },
            };
          }),
        }
      : {},
  });

export const openSessionsModelAdapter = createAgentMetadata();
