import { createMockAgentMachine } from '@repo/mocks/agent';
import { assertEvent, assign, createActor, setup } from 'xstate';
import { registryMachine } from '../src/services/sessions/registry-machine';
import type { SessionInput } from '../src/services/sessions/session-data';
import type { SessionActorRef } from '../src/services/sessions/session-machine';

// Holds closing Sessions until the model completes one; no database or Agent effects.
const session = setup({
  types: {
    input: {} as Pick<SessionInput, 'sessionId'>,
    context: {} as { sessionId: string },
    events: {} as { type: 'session.close' } | { type: 'mock.finish' },
    output: {} as { failure: null },
  },
}).createMachine({
  context: ({ input }) => input,
  initial: 'open',
  output: { failure: null },
  states: {
    open: { on: { 'session.close': 'closing', 'mock.finish': 'closed' } },
    closing: { on: { 'mock.finish': 'closed' } },
    closed: { type: 'final' },
  },
});

export const createRegistryModelMachine = (forGraph: boolean) =>
  registryMachine.provide({
    actions: {
      openSession: assign(({ context, event, spawn }) => {
        assertEvent(event, ['sessions.create', 'sessions.open']);
        if (context.sessions[event.sessionId]) return {};
        const options = {
          id: `session:${event.sessionId}` as never,
          input: { sessionId: event.sessionId },
        };
        // Graph traversal shares a system across branches, so its refs are unstarted and unregistered.
        const actor = forGraph
          ? createActor(session, options)
          : spawn(session, {
              ...options,
              systemId: `session:${event.sessionId}`,
              syncSnapshot: true,
            });
        return {
          sessions: {
            ...context.sessions,
            [event.sessionId]: actor as unknown as SessionActorRef,
          },
        };
      }),
    },
  });

export const registryModelAdapter = {
  agent: 'mock',
  capabilities: { planApproval: 'continueTurn' as const, stopShell: false },
  machine: createMockAgentMachine({
    connect: () => new Promise(() => {}),
    stream: () => undefined,
    stop: async () => {},
  }),
};
