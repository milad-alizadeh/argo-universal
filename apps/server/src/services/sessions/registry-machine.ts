import {
  type AgentAdapter,
  type AgentOutput,
  agentAdapters,
} from '@repo/agents';
import type { SessionNewInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  setup,
} from 'xstate';
import { type SessionActorRef, sessionMachine } from './session-machine';

export interface RegistryInput {
  database: Database;
  runtimeDirectory?: string;
  adapters?: readonly AgentAdapter[];
}

interface RegistryContext extends RegistryInput {
  adapters: readonly AgentAdapter[];
  sessions: Record<string, SessionActorRef>;
}

export type RegistryCommand =
  | ({ type: 'sessions.create'; sessionId: string } & SessionNewInput)
  | {
      type: 'sessions.open';
      sessionId: string;
      agent: string;
    }
  | { type: 'sessions.stopAll' };

type RegistryEvent =
  | RegistryCommand
  | {
      type: `xstate.done.actor.${string}`;
      actorId: string;
      output: AgentOutput;
    }
  | {
      type: `xstate.snapshot.${string}`;
      snapshot: ReturnType<SessionActorRef['getSnapshot']>;
    };

export const registryMachine = setup({
  types: {
    input: {} as RegistryInput,
    context: {} as RegistryContext,
    events: {} as RegistryEvent,
  },
  actors: { session: sessionMachine },
  actions: {
    openSession: assign(({ context, event, spawn }) => {
      assertEvent(event, ['sessions.create', 'sessions.open']);
      if (context.sessions[event.sessionId]) return {};
      const session = spawn('session', {
        id: `session:${event.sessionId}`,
        systemId: `session:${event.sessionId}`,
        syncSnapshot: true,
        input: {
          database: context.database,
          runtimeDirectory: context.runtimeDirectory,
          adapters: context.adapters,
          sessionId: event.sessionId,
          ...(event.type === 'sessions.create'
            ? ({
                kind: 'new',
                projectId: event.projectId,
                agent: event.agent,
                checkout: event.checkout,
              } as const)
            : ({ kind: 'existing' } as const)),
        },
      });
      return { sessions: { ...context.sessions, [event.sessionId]: session } };
    }),
    removeSession: enqueueActions(({ context, event, enqueue }) => {
      if (!event.type.startsWith('xstate.done.actor.') || !('actorId' in event))
        return;
      enqueue.stopChild(event.actorId);
      enqueue.assign({
        sessions: Object.fromEntries(
          Object.entries(context.sessions).filter(
            ([id]) => `session:${id}` !== event.actorId,
          ),
        ),
      });
    }),
    closeSessions: enqueueActions(({ context, enqueue }) => {
      for (const session of Object.values(context.sessions))
        enqueue.sendTo(session, { type: 'session.close' });
    }),
    closeReadySession: enqueueActions(({ context, event, enqueue }) => {
      if (!('snapshot' in event)) return;
      const session = context.sessions[event.snapshot.context.sessionId];
      const snapshot = session?.getSnapshot();
      if (
        session &&
        snapshot?.can({ type: 'session.close' }) &&
        !snapshot.matches({ open: { live: 'closing' } })
      )
        enqueue.sendTo(session, { type: 'session.close' });
    }),
  },
  guards: {
    registeredAgent: ({ context, event }) =>
      (event.type === 'sessions.create' || event.type === 'sessions.open') &&
      context.adapters.some((adapter) => adapter.agent === event.agent),
    noSessions: ({ context }) => Object.keys(context.sessions).length === 0,
  },
}).createMachine({
  id: 'sessions',
  context: ({ input }) => ({
    ...input,
    adapters: input.adapters ?? agentAdapters,
    sessions: {},
  }),
  initial: 'running',
  on: { 'xstate.done.actor.*': { actions: 'removeSession' } },
  states: {
    running: {
      on: {
        'sessions.create': { guard: 'registeredAgent', actions: 'openSession' },
        'sessions.open': { guard: 'registeredAgent', actions: 'openSession' },
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

export type RegistryActorRef = ActorRefFrom<typeof registryMachine>;
