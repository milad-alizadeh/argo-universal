import type { CoreHooks } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  type OutputFrom,
  setup,
} from 'xstate';
import type { AcpResources, InstalledAgents } from '../agents';
import type { WriterActorRef } from '../storage';
import { createSessionActorInput } from './session-actor-input';
import type { SessionCreationInput } from './session-data';
import { type SessionActorRef, sessionMachine } from './session-machine';

// The open Sessions actor's system id, and each Session actor's.
export const openSessionsId = 'sessions';

export const sessionActorId = (sessionId: string): string =>
  `session:${sessionId}`;

const createSessionEvent = 'sessions.create';

const closeSessionEvent = 'session.close';

type ClosureEvent = { type: 'session.close' | 'session.shutdown' };

const closureEvent = (session: SessionActorRef): ClosureEvent => ({
  type: session.getSnapshot().hasTag('archived')
    ? 'session.shutdown'
    : closeSessionEvent,
});

export interface OpenSessionsInput {
  database: Database;
  runtimeDirectory: string;
  now: () => number;
  createId: () => string;
  acpResources: AcpResources;
  installedAgents: InstalledAgents;
  // Plugin Hooks each Session runs on Permission requests and settled Turns.
  hooks: CoreHooks;
  // Handed to every Session: the Engine starts the writer before the open Sessions.
  writer: WriterActorRef;
}

interface OpenSessionsContext extends OpenSessionsInput {
  sessions: Record<string, SessionActorRef>;
}

const withSession = (
  context: OpenSessionsContext,
  sessionId: string,
  actor: SessionActorRef,
): Partial<OpenSessionsContext> => ({
  sessions: { ...context.sessions, [sessionId]: actor },
});

type SessionSnapshot = ReturnType<SessionActorRef['getSnapshot']>;

const canCloseSession = (
  session: SessionActorRef | undefined,
  snapshot: SessionSnapshot,
): session is SessionActorRef =>
  Boolean(
    session &&
    snapshot.can(closureEvent(session)) &&
    !snapshot.hasTag('closing'),
  );

export type OpenSessionsCommand =
  | ({ type: 'sessions.create'; sessionId: string } & SessionCreationInput)
  | {
      type: 'sessions.open' | 'sessions.archive';
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
    // admitting: the machine admits Session commands until every Session stops.
    tags: {} as 'admitting',
  },
  actors: { session: sessionMachine },
  actions: {
    openSession: assign(
      ({ context, event, spawn }): Partial<OpenSessionsContext> => {
        assertEvent(event, [
          createSessionEvent,
          'sessions.open',
          'sessions.archive',
        ]);

        if (context.sessions[event.sessionId]) return {};

        const session = spawn('session', {
          id: sessionActorId(event.sessionId),
          systemId: sessionActorId(event.sessionId),
          syncSnapshot: true,
          input: createSessionActorInput({ context, event }),
        });

        return withSession(context, event.sessionId, session);
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
        enqueue.sendTo(session, closureEvent(session));
    }),
    closeReadySession: enqueueActions(({ context, event, enqueue }): void => {
      if (!('snapshot' in event)) return;
      const { snapshot } = event;
      const session = context.sessions[snapshot.context.sessionId];

      if (canCloseSession(session, snapshot))
        enqueue.sendTo(session, closureEvent(session));
    }),
  },
  guards: {
    isRegisteredAgent: ({ context, event }): boolean => {
      if (event.type === createSessionEvent)
        return context.installedAgents.installedAgent(event.agent).installed;

      return event.type === 'sessions.open';
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
      tags: ['admitting'],
      on: {
        'sessions.create': {
          guard: 'isRegisteredAgent',
          actions: 'openSession',
        },
        'sessions.archive': { actions: 'openSession' },
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
