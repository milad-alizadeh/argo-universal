import {
  type AgentAdapter,
  type AgentCapabilities,
  type AgentCommand,
  type AgentEvent,
  type AgentInput,
  type AgentOutput,
  agentMachine,
} from '@repo/agents';
import type {
  ContentBlock,
  ContextUsage,
  PendingElicitation,
  PendingPermission,
  SessionConfigOption,
  StopReason,
  TurnError,
  TurnUsage,
} from '@repo/contracts';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  fromPromise,
  sendTo,
  setup,
} from 'xstate';
import { agentProbeId } from '../agents/agent-probe-machine';
import { userMessageChange } from '../feed/feed-change';
import { feedMachine } from '../feed/feed-machine';
import { readWrittenRow } from '../feed/feed-row';
import type { writerMachine } from '../feed/writer-machine';
import {
  createSessionCheckout,
  discardSessionCheckout,
  loadSession,
  type NewSessionInput,
  type SessionData,
  type SessionInput,
  toSessionInsert,
} from './session-data';

// The registry passes the adapter for the Session's Agent.
export type SessionMachineInput = SessionInput & { adapter: AgentAdapter };

export type SessionCommand =
  | { type: 'session.prompt'; turnId: string; content: ContentBlock[] }
  | {
      type: 'session.answerPermission';
      toolCallId: string;
      optionId: string | null;
    }
  | {
      type: 'session.answerElicitation';
      action: 'accept' | 'decline' | 'cancel';
      content?: Record<string, unknown>;
    }
  | {
      type: 'session.setConfigOption';
      configId: string;
      value: string | boolean;
    }
  | { type: 'session.cancel' }
  | { type: 'session.close' };

type SessionEvent =
  | SessionCommand
  | AgentEvent
  | { type: 'xstate.done.actor.agent'; output: AgentOutput }
  | { type: 'xstate.error.actor.agent'; error: unknown };
export interface SessionContext extends SessionData {
  input: SessionMachineInput;
  capabilities: AgentCapabilities | null;
  activeTurnId: string | null;
  // When the running Turn started, in epoch milliseconds.
  activeTurnStartedAt: number | null;
  usage: ContextUsage | null;
  permissionQueue: PendingPermission[];
  pendingElicitation: PendingElicitation | null;
  configOptions: SessionConfigOption[];
  agentCrashes: number[];
  failure: string | null;
  // False for a new Session until its Agent is ready and its row is written.
  stored: boolean;
}

const writer = ({ system }: { system: { get: (id: string) => unknown } }) =>
  system.get('databaseWriter') as ActorRefFrom<typeof writerMachine>;

// The values an Agent reconnects with, read from the options it last reported.
const toConfigValues = (configOptions: SessionConfigOption[]) =>
  configOptions.map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));

// The model the Agent runs with, which a Turn records.
const currentModel = (configOptions: SessionConfigOption[]) => {
  const model = configOptions.find((option) => option.category === 'model');
  return model?.type === 'select' ? model.currentValue : null;
};

const sessionSetup = setup({
  types: {
    input: {} as SessionMachineInput,
    context: {} as SessionContext,
    events: {} as SessionEvent,
    output: {} as AgentOutput,
  },
  actors: {
    createCheckout: fromPromise<SessionData, NewSessionInput>(({ input }) =>
      createSessionCheckout(input),
    ),
    discardCheckout: fromPromise<
      void,
      { session: NewSessionInput; checkout: SessionData['checkout'] }
    >(({ input }) => discardSessionCheckout(input.session, input.checkout)),
    loadSession: fromPromise<
      SessionData,
      {
        session: SessionInput;
        writer: ActorRefFrom<typeof writerMachine> | undefined;
      }
    >(({ input }) => loadSession(input.session, input.writer)),
    feed: feedMachine,
    agent: agentMachine,
  },
  actions: {
    rememberSession: assign((_, params: { data: SessionData }) => params.data),
    rememberFailure: assign((_, params: { error: unknown }) => ({
      failure: String(params.error),
    })),
    rememberStartFailure: assign(({ event }) => {
      if (event.type === 'xstate.error.actor.agent')
        return { failure: String(event.error) };
      if (event.type === 'xstate.done.actor.agent' && event.output.failure)
        return { failure: event.output.failure };
      return { failure: 'The Session closed before its Agent started' };
    }),
    addDiscardFailure: assign(({ context, event }) => ({
      failure: `${context.failure}\nThe Checkout was not removed: ${String('error' in event ? event.error : event)}`,
    })),
    // An Agent that could not start may have been signed out or removed since its last probe.
    refreshAgentProbe: enqueueActions(({ context, system, enqueue }) => {
      const probe = system.get(agentProbeId(context.input.adapter.agent));
      if (probe) enqueue.sendTo(probe, { type: 'agentProbe.refresh' });
    }),
    rememberReady: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'agent.ready');
      if (context.stored)
        enqueue.sendTo(writer, {
          type: 'writer.write',
          job: {
            type: 'sessionRowUpdate',
            id: context.sessionId,
            set: {
              vendorSessionId: event.vendorSessionId,
              failure: null,
              configValues: toConfigValues(event.configOptions),
            },
          },
        });
      enqueue.assign({
        vendorSessionId: event.vendorSessionId,
        capabilities: event.capabilities,
        configOptions: event.configOptions,
        configValues: toConfigValues(event.configOptions),
      });
    }),
    // Writes the new Session's row once its Agent is ready, so no empty Session exists.
    storeSession: enqueueActions(({ context, enqueue }) => {
      if (context.input.kind !== 'new') return;
      enqueue.assign({ stored: true });
      enqueue.sendTo(writer, {
        type: 'writer.write',
        job: toSessionInsert(context.input, context),
      });
    }),
    startTurn: enqueueActions(
      (
        { context, enqueue },
        params: { turnId: string; content: ContentBlock[] },
      ) => {
        const startedAt = Date.now();
        enqueue.assign({
          activeTurnId: params.turnId,
          activeTurnStartedAt: startedAt,
        });
        enqueue.sendTo(writer, {
          type: 'writer.write',
          job: {
            type: 'turnInsert',
            turn: {
              id: params.turnId,
              sessionId: context.sessionId,
              startedAt,
              status: 'running',
              model: currentModel(context.configOptions),
            },
          },
        });
        enqueue.sendTo('feed', {
          type: 'feed.change',
          turnId: params.turnId,
          change: userMessageChange(params.turnId, params.content),
        });
        enqueue.sendTo('agent', {
          type: 'agent.prompt',
          turnId: params.turnId,
          content: params.content,
        } satisfies AgentCommand);
      },
    ),
    endTurn: enqueueActions(
      (
        { context, enqueue },
        params: {
          stopReason: StopReason;
          usage?: TurnUsage;
          error?: TurnError;
        },
      ) => {
        if (context.activeTurnId)
          enqueue.sendTo(writer, {
            type: 'writer.write',
            job: {
              type: 'turnUpdate',
              id: context.activeTurnId,
              set: {
                status: 'ended',
                stopReason: params.stopReason,
                endedAt: Date.now(),
                usage: params.usage ?? null,
                error: params.error ?? null,
              },
            },
          });
        enqueue.assign({
          activeTurnId: null,
          activeTurnStartedAt: null,
          permissionQueue: [],
          pendingElicitation: null,
        });
      },
    ),
    forwardFeed: sendTo('feed', ({ context, event }) => {
      assertEvent(event, 'agent.feed');
      return {
        type: 'feed.change',
        change: event.change,
        turnId: context.activeTurnId,
      };
    }),
    rememberUsage: assign(({ event }) => {
      assertEvent(event, 'agent.usage');
      return { usage: event.usage };
    }),
    // Stores the values too, so a Session resumed after a restart keeps its model and mode.
    rememberConfig: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'agent.configOptionsChanged');
      const configValues = toConfigValues(event.configOptions);
      if (context.stored)
        enqueue.sendTo(writer, {
          type: 'writer.write',
          job: {
            type: 'sessionRowUpdate',
            id: context.sessionId,
            set: { configValues },
          },
        });
      enqueue.assign({ configOptions: event.configOptions, configValues });
    }),
    forwardConfig: sendTo('agent', ({ event }) => {
      assertEvent(event, 'session.setConfigOption');
      return { ...event, type: 'agent.setConfigOption' } satisfies AgentCommand;
    }),
    queuePermission: assign(({ context, event }) => {
      assertEvent(event, 'agent.permissionRequested');
      return { permissionQueue: [...context.permissionQueue, event.request] };
    }),
    rememberElicitation: assign(({ event }) => {
      assertEvent(event, 'agent.elicitationRequested');
      return { pendingElicitation: event.request };
    }),
    answerPermission: sendTo('agent', ({ event }) => {
      assertEvent(event, 'session.answerPermission');
      return {
        ...event,
        type: 'agent.answerPermission',
      } satisfies AgentCommand;
    }),
    removePermission: assign({
      permissionQueue: ({ context }) => context.permissionQueue.slice(1),
    }),
    answerElicitation: sendTo('agent', ({ event }) => {
      assertEvent(event, 'session.answerElicitation');
      return {
        ...event,
        type: 'agent.answerElicitation',
      } satisfies AgentCommand;
    }),
    removeElicitation: assign({ pendingElicitation: null }),
    cancelRequests: enqueueActions(({ context, enqueue }) => {
      for (const request of context.permissionQueue)
        enqueue.sendTo('agent', {
          type: 'agent.answerPermission',
          toolCallId: request.toolCallId,
          optionId: null,
        } satisfies AgentCommand);
      if (context.pendingElicitation)
        enqueue.sendTo('agent', {
          type: 'agent.answerElicitation',
          action: 'cancel',
        } satisfies AgentCommand);
      enqueue.assign({ permissionQueue: [], pendingElicitation: null });
    }),
    cancelAgent: sendTo('agent', {
      type: 'agent.cancel',
    } satisfies AgentCommand),
    stopAgent: sendTo('agent', { type: 'agent.stop' } satisfies AgentCommand),
    recordCrash: enqueueActions(({ context, enqueue }) => {
      const now = Date.now();
      const agentCrashes = [
        ...context.agentCrashes.filter((at) => at > now - 600_000),
        now,
      ];
      enqueue.assign({ agentCrashes });
      enqueue.sendTo('feed', {
        type: 'feed.change',
        turnId: context.activeTurnId,
        change: {
          type: 'upsert',
          update: {
            id: `${context.sessionId}:crash:${now}:${agentCrashes.length}`,
            sessionUpdate: 'notice',
            state: 'settled',
            severity: 'warning',
            title: 'The Agent stopped unexpectedly',
          },
        },
      });
    }),
    giveUp: enqueueActions(({ context, enqueue }) => {
      const failure = 'The Agent stopped three times in ten minutes';
      enqueue.assign({ failure });
      enqueue.sendTo(writer, {
        type: 'writer.write',
        job: {
          type: 'sessionRowUpdate',
          id: context.sessionId,
          set: { failure },
        },
      });
    }),
    cancelNotice: sendTo('feed', ({ context }) => ({
      type: 'feed.change',
      turnId: context.activeTurnId,
      change: {
        type: 'upsert',
        update: {
          id: `${context.activeTurnId}:cancel-timeout`,
          sessionUpdate: 'notice',
          state: 'settled',
          severity: 'warning',
          title: 'The Agent did not stop after cancellation',
        },
      },
    })),
    flushFeed: sendTo('feed', { type: 'feed.flush' }),
  },
  guards: {
    isNew: ({ context }) => context.input.kind === 'new',
    isUnstored: ({ context }) => !context.stored,
    isPermissionHead: ({ context, event }) =>
      event.type === 'session.answerPermission' &&
      context.permissionQueue[0]?.toolCallId === event.toolCallId,
    hasPermission: ({ context }) => context.permissionQueue.length > 0,
    hasElicitation: ({ context }) => context.pendingElicitation !== null,
    tooManyCrashes: ({ context }) => context.agentCrashes.length >= 3,
  },
  delays: {
    cancelLimit: 10_000,
    agentStopLimit: 5_000,
    agentRestartDelay: 1_000,
    feedFlushLimit: 5_000,
  },
});

const sessionEntryOutcome = {
  onDone: {
    target: 'open',
    actions: {
      type: 'rememberSession',
      params: ({ event }: { event: { output: SessionData } }) => ({
        data: event.output,
      }),
    },
  },
  onError: {
    target: 'closed',
    actions: {
      type: 'rememberFailure',
      params: ({ event }: { event: { error: unknown } }) => ({
        error: event.error,
      }),
    },
  },
} as const;

// The prompt that `session.new` carried in; only a new Session is ever unstored.
const firstTurn = ({ context }: { context: SessionContext }) => {
  if (context.input.kind !== 'new')
    throw new Error('Only a new Session has a first Turn');
  return { turnId: context.input.turnId, content: context.input.prompt };
};

// An Agent that ends before its Session is stored discards the Session; a stored one recovers.
const agentEnded = [
  {
    guard: 'isUnstored',
    target: '#session.discarding',
    actions: ['rememberStartFailure', 'refreshAgentProbe'],
  },
  {
    target: 'recovering',
    actions: [
      'recordCrash',
      { type: 'endTurn', params: { stopReason: 'error' } },
    ],
  },
] as const;

const endedTurn = {
  type: 'endTurn',
  params: ({
    event,
  }: {
    event: Extract<AgentEvent, { type: 'agent.turnEnded' }>;
  }) => ({
    stopReason: event.stopReason,
    usage: event.usage,
    error: event.error,
  }),
} as const;

export const sessionMachine = sessionSetup.createMachine({
  id: 'session',
  context: ({ input }) => ({
    input,
    sessionId: input.sessionId,
    projectId: input.kind === 'new' ? input.projectId : '',
    agent: input.kind === 'new' ? input.agent : '',
    vendorSessionId: null,
    checkout: { path: '', branch: null },
    configValues: [],
    epoch: 0,
    maxRevision: 0,
    activityAt: 0,
    nextPosition: 0,
    capabilities: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    pendingElicitation: null,
    configOptions: [],
    agentCrashes: [],
    failure: null,
    stored: input.kind === 'existing',
  }),
  output: ({ context }) => ({ failure: context.failure }),
  initial: 'entering',
  states: {
    entering: {
      always: [{ guard: 'isNew', target: 'creating' }, { target: 'loading' }],
    },
    creating: {
      invoke: {
        id: 'createCheckout',
        src: 'createCheckout',
        input: ({ context }) => context.input as NewSessionInput,
        ...sessionEntryOutcome,
      },
    },
    loading: {
      invoke: {
        id: 'loadSession',
        src: 'loadSession',
        input: ({ context, self }) => ({
          session: context.input,
          writer: self.system.get('databaseWriter') as
            | ActorRefFrom<typeof writerMachine>
            | undefined,
        }),
        ...sessionEntryOutcome,
      },
    },
    open: {
      invoke: {
        id: 'feed',
        src: 'feed',
        input: ({ context, self }) => ({
          sessionId: context.sessionId,
          epoch: context.epoch,
          maxRevision: context.maxRevision,
          activityAt: context.activityAt,
          nextPosition: context.nextPosition,
          findWrittenRow: (id) =>
            readWrittenRow({
              database: context.input.database,
              writer: self.system.get('databaseWriter') as
                | ActorRefFrom<typeof writerMachine>
                | undefined,
              sessionId: context.sessionId,
              id,
            }),
        }),
        onDone: { target: 'closed' },
      },
      initial: 'live',
      states: {
        live: {
          invoke: {
            id: 'agent',
            src: 'agent',
            input: ({
              context,
              self,
            }: {
              context: SessionContext;
              self: AgentInput['parent'];
            }) => ({
              adapter: context.input.adapter,
              sessionId: context.sessionId,
              cwd: context.checkout.path,
              vendorSessionId: context.vendorSessionId,
              configOptions: context.configValues,
              parent: self,
            }),
            onDone: agentEnded,
            onError: agentEnded,
          },
          initial: 'starting',
          on: {
            'agent.feed': { actions: 'forwardFeed' },
            'agent.usage': { actions: 'rememberUsage' },
            'agent.configOptionsChanged': { actions: 'rememberConfig' },
            'session.close': { target: '.closing' },
          },
          states: {
            starting: {
              on: {
                'agent.ready': [
                  {
                    guard: 'isUnstored',
                    target: 'running',
                    actions: [
                      'rememberReady',
                      'storeSession',
                      { type: 'startTurn', params: firstTurn },
                    ],
                  },
                  { target: 'idle', actions: 'rememberReady' },
                ],
                'session.close': {
                  guard: 'isUnstored',
                  target: '#session.discarding',
                  actions: 'rememberStartFailure',
                },
              },
            },
            idle: {
              on: {
                'session.prompt': {
                  target: 'running',
                  actions: {
                    type: 'startTurn',
                    params: ({ event }) => ({
                      turnId: event.turnId,
                      content: event.content,
                    }),
                  },
                },
                'session.setConfigOption': { actions: 'forwardConfig' },
              },
            },
            running: {
              initial: 'working',
              on: {
                'agent.permissionRequested': {
                  target: '.awaitingPermission',
                  actions: 'queuePermission',
                },
                'agent.elicitationRequested': {
                  target: '.awaitingElicitation',
                  actions: 'rememberElicitation',
                },
                'session.answerPermission': {
                  guard: 'isPermissionHead',
                  target: '.working',
                  actions: ['answerPermission', 'removePermission'],
                },
                'session.answerElicitation': {
                  guard: 'hasElicitation',
                  target: '.working',
                  actions: ['answerElicitation', 'removeElicitation'],
                },
                'agent.turnEnded': { target: 'idle', actions: endedTurn },
                'session.cancel': { target: 'cancelling' },
              },
              states: {
                working: {
                  always: [
                    { guard: 'hasPermission', target: 'awaitingPermission' },
                    { guard: 'hasElicitation', target: 'awaitingElicitation' },
                  ],
                },
                awaitingPermission: {},
                awaitingElicitation: {},
              },
            },
            cancelling: {
              entry: ['cancelAgent', 'cancelRequests'],
              on: { 'agent.turnEnded': { target: 'idle', actions: endedTurn } },
              after: {
                cancelLimit: {
                  target: '#session.open.recovering',
                  actions: [
                    'cancelNotice',
                    { type: 'endTurn', params: { stopReason: 'cancelled' } },
                  ],
                },
              },
            },
            closing: {
              entry: [
                'cancelRequests',
                { type: 'endTurn', params: { stopReason: 'cancelled' } },
                'stopAgent',
              ],
              on: {
                'xstate.done.actor.agent': { target: '#session.open.flushing' },
                'xstate.error.actor.agent': {
                  target: '#session.open.flushing',
                },
              },
              after: { agentStopLimit: '#session.open.flushing' },
            },
          },
        },
        recovering: {
          always: {
            guard: 'tooManyCrashes',
            target: 'flushing',
            actions: 'giveUp',
          },
          after: { agentRestartDelay: 'live' },
          on: { 'session.close': 'flushing' },
        },
        flushing: {
          entry: 'flushFeed',
          after: { feedFlushLimit: '#session.closed' },
        },
      },
    },
    // A new Session whose Agent never started leaves no worktree behind.
    discarding: {
      invoke: {
        id: 'discardCheckout',
        src: 'discardCheckout',
        input: ({ context }) => ({
          session: context.input as NewSessionInput,
          checkout: context.checkout,
        }),
        onDone: { target: 'closed' },
        onError: { target: 'closed', actions: 'addDiscardFailure' },
      },
    },
    closed: { type: 'final' },
  },
});
export type SessionActorRef = ActorRefFrom<typeof sessionMachine>;
