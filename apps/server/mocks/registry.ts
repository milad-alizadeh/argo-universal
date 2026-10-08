import { createMockAdapter } from '@repo/mocks/agent';
import {
  assertEvent,
  assign,
  createActor,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import { registryMachine } from '../src/services/sessions/registry-machine';
import { createRegistrySessionInput } from '../src/services/sessions/registry-session-input';
import type { SessionData } from '../src/services/sessions/session-data';
import { sessionMachine } from '../src/services/sessions/session-machine';

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

export const registryModelAdapter = createMockAdapter({
  connect: (): Promise<import('@repo/agents').AgentReady> =>
    new Promise((): void => {}),
});
