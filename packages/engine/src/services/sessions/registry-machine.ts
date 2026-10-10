import { type AgentAdapter, agentAdapters } from '@repo/agents';
import type { Database } from '@repo/db';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  type OutputFrom,
  setup,
} from 'xstate';
import { agentProbeId, agentProbeMachine } from '../agents';
import type { AcpResources, ResolveAgentLaunch } from '../agents';
import { admitsExistingSession, admitsNewSession } from './agent-admission';
import { createRegistrySessionInput } from './registry-session-input';
import type { SessionCreationInput } from './session-data';
import { type SessionActorRef, sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

const createSessionEvent = 'sessions.create';
const closeSessionEvent = 'session.close';

export interface RegistryInput {
  database: Database;
  runtimeDirectory: string;
  now: () => number;
  createId: () => string;
  adapters?: readonly AgentAdapter[];
  acpResources?: AcpResources;
  resolveAgentLaunch?: ResolveAgentLaunch;
}

interface RegistryContext extends RegistryInput {
  adapters: readonly AgentAdapter[];
  sessions: Record<string, SessionActorRef>;
}

export type RegistryCommand =
  | ({ type: 'sessions.create'; sessionId: string } & SessionCreationInput)
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

export const registryMachine = setup({
  types: {
    input: {} as RegistryInput,
    context: {} as RegistryContext,
    events: {} as RegistryEvent,
  },
  actors: { session: sessionMachine, agentProbe: agentProbeMachine },
  actions: {
    // Each Agent is probed once at start, so the first `agents.list` rarely waits.
    spawnAgentProbes: enqueueActions(({ context, enqueue }): void => {
      for (const adapter of context.adapters)
        enqueue.spawnChild('agentProbe', {
          id: agentProbeId(adapter.agent),
          systemId: agentProbeId(adapter.agent),
          input: { adapter },
        });
    }),
    openSession: assign(
      ({ context, event, spawn }): Partial<RegistryContext> => {
        assertEvent(event, [createSessionEvent, 'sessions.open']);
        if (context.sessions[event.sessionId]) return {};
        const session = spawn('session', {
          id: sessionActorId(event.sessionId),
          systemId: sessionActorId(event.sessionId),
          syncSnapshot: true,
          input: createRegistrySessionInput({ context, event }),
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
        !snapshot.matches({ open: 'draining' })
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
  context: ({ input }): RegistryContext => ({
    ...input,
    adapters: input.adapters ?? agentAdapters,
    sessions: {},
  }),
  entry: 'spawnAgentProbes',
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

export type RegistryActorRef = ActorRefFrom<typeof registryMachine>;
