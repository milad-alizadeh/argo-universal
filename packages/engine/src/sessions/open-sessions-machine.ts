import type { Database } from '@repo/db';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  type OutputFrom,
  setup,
} from 'xstate';
import type { AcpResources } from '../agents';
import { admitsExistingSession, admitsNewSession } from './agent-admission';
import { createSessionActorInput } from './session-actor-input';
import type { SessionCreationInput } from './session-data';
import { type SessionActorRef, sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

const createSessionEvent = 'sessions.create';

const closeSessionEvent = 'session.close';

export interface OpenSessionsInput {
  database: Database;
  runtimeDirectory: string;
  now: () => number;
  createId: () => string;
  acpResources: AcpResources;
  isAgentSetupBusy?: (agentId: string) => boolean;
}

interface OpenSessionsContext extends OpenSessionsInput {
  sessions: Record<string, SessionActorRef>;
}

export type OpenSessionsCommand =
  | ({ type: 'sessions.create'; sessionId: string } & SessionCreationInput)
  | {
      type: 'sessions.open';
      sessionId: string;
      agent: string;
    }
  | { type: 'sessions.stopAll' };

type OpenSessionsEvent =
  | OpenSessionsCommand
  | {
      type: `xstate.done.actor.${string}`;
      actorId: string;
      output: OutputFrom<typeof sessionMachine>;
    }
  | {
      type: `xstate.error.actor.${string}`;
      actorId: string;
      error: unknown;
    }
  | {
      type: `xstate.snapshot.${string}`;
      snapshot: ReturnType<SessionActorRef['getSnapshot']>;
    };

export const openSessionsMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as OpenSessionsInput,
    context: {} as OpenSessionsContext,
    events: {} as OpenSessionsEvent,
  },
  actors: { session: sessionMachine },
  actions: {
    openSession: assign(
      ({ context, event, spawn }): Partial<OpenSessionsContext> => {
        assertEvent(event, [createSessionEvent, 'sessions.open']);

        if (context.sessions[event.sessionId]) return {};

        const session = spawn('session', {
          id: sessionActorId(event.sessionId),
          systemId: sessionActorId(event.sessionId),
          syncSnapshot: true,
          input: createSessionActorInput({ context, event }),
        });

        return {
          sessions: { ...context.sessions, [event.sessionId]: session },
        };
      },
    ),
    removeSession: enqueueActions(({ context, event, enqueue }): void => {
      if (!('actorId' in event)) return;
      enqueue.stopChild(event.actorId);
      enqueue.assign({
        sessions: Object.fromEntries(
          Object.entries(context.sessions).filter(
            ([id]): boolean => sessionActorId(id) !== event.actorId,
          ),
        ),
      });
    }),
    logActorFailure: ({ event }): void => {
      assertEvent(event, 'xstate.error.actor.*');
      console.error(
        `sessions: ${event.actorId} failed: ${String(event.error)}`,
      );
    },
    closeSessions: enqueueActions(({ context, enqueue }): void => {
      for (const session of Object.values(context.sessions))
        enqueue.sendTo(session, { type: closeSessionEvent });
    }),
    closeReadySession: enqueueActions(({ context, event, enqueue }): void => {
      if (!('snapshot' in event)) return;
      const { snapshot } = event;
      const session = context.sessions[snapshot.context.sessionId];

      if (
        session &&
        snapshot.can({ type: closeSessionEvent }) &&
        !snapshot.matches({ open: { acp: 'closing' } })
      )
        enqueue.sendTo(session, { type: closeSessionEvent });
    }),
  },
  guards: {
    isRegisteredAgent: ({ context, event }): boolean => {
      if (event.type === createSessionEvent)
        return admitsNewSession(context, event.agent);

      return (
        event.type === 'sessions.open' &&
        admitsExistingSession(context, event.agent)
      );
    },
    isSessionFailure: ({ event }): boolean =>
      'actorId' in event && event.actorId.startsWith('session:'),
    noSessions: ({ context }): boolean =>
      Object.keys(context.sessions).length === 0,
  },
}).createMachine({
  id: 'sessions',
  context: ({ input }): OpenSessionsContext => ({
    ...input,
    sessions: {},
  }),
  initial: 'running',
  on: {
    'xstate.done.actor.*': { actions: 'removeSession' },
    'xstate.error.actor.*': [
      {
        guard: 'isSessionFailure',
        actions: ['logActorFailure', 'removeSession'],
      },
      { actions: 'logActorFailure' },
    ],
  },
  states: {
    running: {
      on: {
        'sessions.create': {
          guard: 'isRegisteredAgent',
          actions: 'openSession',
        },
        'sessions.open': { guard: 'isRegisteredAgent', actions: 'openSession' },
        'sessions.stopAll': { target: 'stopping' },
      },
    },
    stopping: {
      entry: 'closeSessions',
      on: { 'xstate.snapshot.*': { actions: 'closeReadySession' } },
      always: { guard: 'noSessions', target: 'stopped' },
    },
    stopped: { type: 'final' },
  },
});

export type OpenSessionsActorRef = ActorRefFrom<typeof openSessionsMachine>;
