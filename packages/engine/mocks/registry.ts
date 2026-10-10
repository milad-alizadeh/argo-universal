import { createAgentMetadata } from '@repo/mocks/agent';
import {
  assertEvent,
  assign,
  createActor,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  registryMachine,
  createRegistrySessionInput,
  type SessionData,
  sessionMachine,
} from '../src/services/sessions';

const session = sessionMachine.provide({
  actors: {
    createCheckout: fromPromise(
      (): Promise<SessionData> => new Promise(() => {}),
    ),
    loadSession: fromPromise((): Promise<SessionData> => new Promise(() => {})),
  },
});

export const createRegistryModelMachine = (
  forGraph: boolean,
): typeof registryMachine =>
  registryMachine.provide({
    actors: { session },
    actions: forGraph
      ? {
          spawnAgentProbes: (): void => {},
          openSession: assign(
            ({
              context,
              event,
            }): Partial<SnapshotFrom<typeof registryMachine>['context']> => {
              assertEvent(event, ['sessions.create', 'sessions.open']);
              if (context.sessions[event.sessionId]) return {};
              const actor = createActor(session, {
                id: `session:${event.sessionId}`,
                input: createRegistrySessionInput({ context, event }),
              });
              return {
                sessions: { ...context.sessions, [event.sessionId]: actor },
              };
            },
          ),
        }
      : {},
  });

export const registryModelAdapter = createAgentMetadata();
