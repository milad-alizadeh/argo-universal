import {
  type AgentAdapter,
  agentAdapters,
  findAgentAdapter,
} from '@repo/agents';
import type { Database } from '@repo/db';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  type OutputFrom,
  setup,
} from 'xstate';
import { agentProbeId, agentProbeMachine } from '../agents/agent-probe-machine';
import type { SessionCreationInput } from './session-data';
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
    spawnAgentProbes: enqueueActions(({ context, enqueue }) => {
      for (const adapter of context.adapters)
        enqueue.spawnChild('agentProbe', {
          id: agentProbeId(adapter.agent),
          systemId: agentProbeId(adapter.agent),
          input: { adapter },
        });
    }),
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
          adapter: findAgentAdapter(event.agent, context.adapters),
          sessionId: event.sessionId,
          ...(event.type === 'sessions.create'
            ? {
                kind: 'new',
                projectId: event.projectId,
                agent: event.agent,
                checkout: event.checkout,
                configOptions: event.configOptions,
                prompt: event.prompt,
                turnId: event.turnId,
              }
            : { kind: 'existing' }),
        },
      });
      return { sessions: { ...context.sessions, [event.sessionId]: session } };
    }),
    removeSession: enqueueActions(({ context, event, enqueue }) => {
      if (!('actorId' in event)) return;
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
      const { snapshot } = event;
      const session = context.sessions[snapshot.context.sessionId];
      if (
        session &&
        snapshot.can({ type: 'session.close' }) &&
        !snapshot.matches({ open: { live: 'closing' } })
      )
        enqueue.sendTo(session, { type: 'session.close' });
    }),
  },
  guards: {
    isRegisteredAgent: ({ context, event }) =>
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
  entry: 'spawnAgentProbes',
  initial: 'running',
  on: { 'xstate.done.actor.*': { actions: 'removeSession' } },
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
