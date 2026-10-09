import {
  type AgentAdapter,
  type AgentCapabilities,
  type AgentCommand,
  type AgentConfigValue,
  type AgentEvent,
  type AgentConnectInput,
  type AgentMapping,
  type VendorCommand,
  type VendorSession,
  acceptAgentEvent,
  AgentReadyData,
  describeError,
} from '@repo/agents';
import type {
  ContentBlock,
  ContextUsage,
  FeedChange,
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
  fromCallback,
  sendTo,
  setup,
  stateIn,
} from 'xstate';
import { countRejection } from '../../lib/count-rejections';
import { findAgentProbe } from '../agents';
import { findDatabaseWriter } from '../feed';
import { userMessageChange } from '../feed';
import { feedMachine } from '../feed';
import { readWrittenRow } from '../feed';
import type { writerMachine } from '../feed';
import {
  createSessionCheckout,
  discardSessionCheckout,
  loadSession,
  type NewSessionInput,
  type SessionData,
  type SessionInput,
  toSessionInsert,
} from './session-data';

const nativeFailedEvent = 'native.failed';
const rejectedMessageEvent = 'agent.messageRejected';
const drainingNativeTarget = '#session.open.draining';
const answerPermissionCommand = 'agent.answerPermission';
const answerElicitationCommand = 'agent.answerElicitation';
const writeFeedEvent = 'writer.write';
const feedChangeEvent = 'feed.change';

type FeedChangeEvent = Extract<
  import('../feed').FeedEvent,
  { type: 'feed.change' }
>;
type SessionDataParameters = { data: SessionData };
type FailureParameters = { error: unknown };
type LoadSessionInput = {
  session: SessionInput;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
};
type DiscardCheckoutInput = {
  session: NewSessionInput;
  checkout: SessionData['checkout'];
};
type EndTurnParameters = {
  stopReason: StopReason;
  usage?: TurnUsage;
  error?: TurnError;
};
type StartTurnParameters = { turnId: string; content: ContentBlock[] };

// The registry passes the adapter for the Session's Agent.
export type SessionMachineInput = SessionInput & {
  adapter: AgentAdapter;
  now: () => number;
  createId: () => string;
};

export type SessionCommand =
  | { type: 'session.prompt'; turnId: string; content: ContentBlock[] }
  | {
      type: 'session.answerPermission';
      toolCallId: string;
      optionId: PendingPermission['options'][number]['optionId'] | null;
      message?: string;
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

type NativeFailure = { type: typeof nativeFailedEvent; error: unknown };
type SessionEvent =
  | SessionCommand
  | AgentEvent
  | NativeFailure
  | { type: 'xstate.error.actor.vendorSession'; error: unknown };
type NativeSessionInput = AgentConnectInput &
  Pick<SessionMachineInput, 'adapter'> &
  Pick<SessionContext, 'pendingNativeStops'>;
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
  heldConfigValues: AgentConfigValue[];
  agentCrashes: number[];
  rejectedMessages: number;
  failure: string | null;
  pendingNativeStops: Set<Promise<void>>;
  // False for a new Session until its Agent is ready and its row is written.
  stored: boolean;
}

const checkoutLimit = 10_000;
const agentStartLimit = 10_000;

// The Session gives up on its Agent after this many crashes within the window.
const crashWindowMs = 600_000;
const maxCrashesInWindow = 3;

const writer = ({
  system,
  self,
}: {
  system: import('xstate').AnyActorRef['system'];
  self: import('xstate').AnyActorRef;
}): import('xstate').AnyActorRef => findDatabaseWriter(system) ?? self;

// The values an Agent reconnects with, read from the options it last reported.
const toConfigValues = (
  configOptions: SessionConfigOption[],
): AgentConfigValue[] =>
  configOptions.map((option): AgentConfigValue => ({
    configId: option.configId,
    value: option.currentValue,
  }));

// The model the Agent runs with, which a Turn records.
const currentModel = (configOptions: SessionConfigOption[]): string | null => {
  const model = configOptions.find(
    (option): boolean => option.category === 'model',
  );
  return model?.type === 'select' ? model.currentValue : null;
};

const permissionOutcomeChange = (
  toolCallId: string,
  optionId: string | null,
): FeedChange => ({
  type: 'patch',
  id: toolCallId,
  set: {
    _meta: {
      argo: {
        permissionOutcome:
          optionId === null
            ? { outcome: 'cancelled' }
            : { outcome: 'selected', optionId },
      },
    },
  },
});

const sessionSetup = setup({
  types: {
    input: {} as SessionMachineInput,
    children: {} as { feed: 'feed' },
    context: {} as SessionContext,
    events: {} as SessionEvent,
    output: {} as Pick<SessionContext, 'failure'>,
  },
  actors: {
    createCheckout: fromPromise<SessionData, NewSessionInput>(
      ({ input, signal }): Promise<SessionData> =>
        createSessionCheckout(input, signal),
    ),
    discardCheckout: fromPromise<void, DiscardCheckoutInput>(
      ({ input, signal }): Promise<void> =>
        discardSessionCheckout(input.session, input.checkout, signal),
    ),
    loadSession: fromPromise<SessionData, LoadSessionInput>(
      ({ input }): Promise<SessionData> =>
        loadSession(input.session, input.writer),
    ),
    feed: feedMachine,
    drainNative: fromPromise<void, SessionContext['pendingNativeStops']>(
      async ({ input }): Promise<void> => {
        await Promise.allSettled(input);
      },
    ),
    vendorSession: fromCallback<
      VendorCommand,
      NativeSessionInput,
      AgentEvent | NativeFailure
    >(({ input: nativeSessionInput, receive, sendBack }): (() => void) => {
      const nativeAbort = new AbortController();
      let mappingState = nativeSessionInput.adapter.initialMappingState();
      let bufferedEvents: AgentEvent[] | null = [];
      let nativeStop: Promise<void> | undefined;
      const reportNativeFailure = (error: unknown): void => {
        if (!nativeAbort.signal.aborted)
          sendBack({ type: nativeFailedEvent, error });
      };
      const sendAcceptedEvent = (event: AgentEvent): void => {
        if (nativeAbort.signal.aborted) return;
        const accepted = acceptAgentEvent(event);
        if (bufferedEvents) bufferedEvents.push(accepted);
        else sendBack(accepted);
      };
      const connection = nativeSessionInput.adapter
        .connect(
          {
            sessionId: nativeSessionInput.sessionId,
            cwd: nativeSessionInput.cwd,
            vendorSessionId: nativeSessionInput.vendorSessionId,
            configOptions: nativeSessionInput.configOptions,
          },
          {
            event: sendAcceptedEvent,
            failed: reportNativeFailure,
            message: (message): void => {
              if (nativeAbort.signal.aborted) return;
              let mapped: AgentMapping<unknown>;
              try {
                mapped = nativeSessionInput.adapter.toAgentEvents(
                  message,
                  mappingState,
                );
              } catch (error) {
                sendAcceptedEvent({
                  type: rejectedMessageEvent,
                  reason: describeError(error),
                });
                return;
              }
              mappingState = mapped.mappingState;
              for (const event of mapped.events) sendAcceptedEvent(event);
            },
          },
          nativeAbort.signal,
        )
        .then(
          (session): VendorSession => {
            if (nativeAbort.signal.aborted) return session;
            const ready = AgentReadyData.safeParse(session.ready);
            if (!ready.success) {
              reportNativeFailure(ready.error);
              return session;
            }
            sendBack({ type: 'agent.ready', ...ready.data });
            const readyEvents = bufferedEvents;
            bufferedEvents = null;
            for (const event of readyEvents ?? [])
              if (!nativeAbort.signal.aborted) sendBack(event);
            return session;
          },
          (error: unknown): null => {
            reportNativeFailure(error);
            return null;
          },
        );
      const stopNative = (): void => {
        if (nativeStop) return;
        nativeStop = connection.then((session): Promise<void> | undefined =>
          session?.stop(),
        );
        nativeSessionInput.pendingNativeStops.add(nativeStop);
        const settled = nativeStop;
        void settled.then(
          (): boolean => nativeSessionInput.pendingNativeStops.delete(settled),
          (): boolean => nativeSessionInput.pendingNativeStops.delete(settled),
        );
        nativeAbort.abort();
      };
      const runCommand = async (command: VendorCommand): Promise<void> => {
        try {
          if (nativeAbort.signal.aborted) return;
          const session = await connection;
          if (!nativeAbort.signal.aborted) await session?.run(command);
        } catch (error) {
          reportNativeFailure(error);
        }
      };
      let commandQueue = Promise.resolve();
      let beforeTurnCommands = commandQueue;
      receive((command): void => {
        if (
          command.type === 'agent.cancel' ||
          command.type === answerPermissionCommand ||
          command.type === answerElicitationCommand
        ) {
          void beforeTurnCommands.then((): Promise<void> =>
            runCommand(command),
          );
          return;
        }
        if (
          command.type === 'agent.prompt' ||
          (command.type === 'agent.answerPlanProposal' &&
            command.turnId !== undefined)
        )
          beforeTurnCommands = commandQueue;
        commandQueue = commandQueue.then((): Promise<void> =>
          runCommand(command),
        );
      });
      return stopNative;
    }),
  },
  actions: {
    rememberSession: assign(
      (_, params: SessionDataParameters): SessionData => params.data,
    ),
    rememberFailure: assign(
      (_, params: FailureParameters): Pick<SessionContext, 'failure'> => ({
        failure: String(params.error),
      }),
    ),
    rememberStartLimit: assign({
      failure: `Agent startup exceeded agentStartLimit (${agentStartLimit} ms). Retry the Session.`,
    }),
    rememberStartFailure: assign(
      ({ event }): Pick<SessionContext, 'failure'> => {
        if (
          event.type === 'xstate.error.actor.vendorSession' ||
          event.type === nativeFailedEvent
        )
          return { failure: describeError(event.error) };
        return { failure: 'The Session closed before its Agent started' };
      },
    ),
    addDiscardFailure: assign(
      ({ context, event }): Pick<SessionContext, 'failure'> => ({
        failure: `${context.failure}\nThe Checkout was not removed: ${String('error' in event ? event.error : event)}`,
      }),
    ),
    // An Agent that could not start may have been signed out or removed since its last probe.
    refreshAgentProbe: enqueueActions(({ context, system, enqueue }): void => {
      const probe = findAgentProbe(system, context.input.adapter.agent);
      if (probe) enqueue.sendTo(probe, { type: 'agentProbe.refresh' });
    }),
    rememberReady: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'agent.ready');
      if (context.stored)
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
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
        configOptions: keepHeldConfigChoices(
          event.configOptions,
          context.heldConfigValues,
        ),
        configValues: toConfigValues(event.configOptions),
      });
    }),
    // Writes the new Session's row once its Agent is ready, so no empty Session exists.
    storeSession: enqueueActions(({ context, enqueue }): void => {
      if (context.input.kind !== 'new') return;
      enqueue.assign({ stored: true });
      enqueue.sendTo(writer, {
        type: writeFeedEvent,
        job: toSessionInsert(context.input, context),
      });
    }),
    persistTurn: enqueueActions(
      (
        { context, enqueue },
        params: Pick<StartTurnParameters, 'turnId'>,
      ): void => {
        const startedAt = context.input.now();
        enqueue.assign({
          activeTurnId: params.turnId,
          activeTurnStartedAt: startedAt,
        });
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
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
      },
    ),
    startTurn: enqueueActions(
      ({ context, enqueue }, params: StartTurnParameters): void => {
        for (const choice of context.heldConfigValues)
          enqueue.sendTo('vendorSession', {
            type: 'agent.setConfigOption',
            ...choice,
          } satisfies AgentCommand);
        enqueue.assign({ heldConfigValues: [] });
        enqueue.sendTo('feed', {
          type: feedChangeEvent,
          turnId: params.turnId,
          change: userMessageChange(params.turnId, params.content),
        });
        enqueue.sendTo('vendorSession', {
          type: 'agent.prompt',
          turnId: params.turnId,
          content: params.content,
        } satisfies AgentCommand);
      },
    ),
    endTurn: enqueueActions(
      ({ context, enqueue }, params: EndTurnParameters): void => {
        if (context.activeTurnId)
          enqueue.sendTo(writer, {
            type: writeFeedEvent,
            job: {
              type: 'turnUpdate',
              id: context.activeTurnId,
              set: {
                status: 'ended',
                stopReason: params.stopReason,
                endedAt: context.input.now(),
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
    forwardFeed: sendTo(
      'feed',
      ({
        context,
        event,
      }): Extract<import('../feed').FeedEvent, { type: 'feed.change' }> => {
        assertEvent(event, 'agent.feed');
        return {
          type: feedChangeEvent,
          change: event.change,
          turnId: context.activeTurnId,
        };
      },
    ),
    rememberUsage: assign(({ event }): Pick<SessionContext, 'usage'> => {
      assertEvent(event, 'agent.usage');
      return { usage: event.usage };
    }),
    // Stores the values too, so a Session resumed after a restart keeps its model and mode.
    rememberConfig: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'agent.configOptionsChanged');
      const configValues = toConfigValues(event.configOptions);
      if (context.stored)
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
          job: {
            type: 'sessionRowUpdate',
            id: context.sessionId,
            set: { configValues },
          },
        });
      enqueue.assign({
        configOptions: keepHeldConfigChoices(
          event.configOptions,
          context.heldConfigValues,
        ),
        configValues,
      });
    }),
    forwardConfig: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'session.setConfigOption');
      enqueue.assign({
        configOptions: chooseConfigValue(context.configOptions, event, false),
        heldConfigValues: context.heldConfigValues.filter(
          (choice): boolean => choice.configId !== event.configId,
        ),
      });
      enqueue.sendTo('vendorSession', {
        ...event,
        type: 'agent.setConfigOption',
      } satisfies AgentCommand);
    }),
    holdConfig: assign(
      ({
        context,
        event,
      }): Pick<SessionContext, 'heldConfigValues' | 'configOptions'> => {
        assertEvent(event, 'session.setConfigOption');
        const choice = { configId: event.configId, value: event.value };
        const previous = context.heldConfigValues;
        const heldConfigValues = previous.some(
          (value): boolean => value.configId === choice.configId,
        )
          ? previous.map((value): AgentConfigValue =>
              value.configId === choice.configId ? choice : value,
            )
          : [...previous, choice];
        return {
          heldConfigValues,
          configOptions: chooseConfigValue(context.configOptions, choice, true),
        };
      },
    ),
    queuePermission: assign(
      ({ context, event }): Pick<SessionContext, 'permissionQueue'> => {
        assertEvent(event, 'agent.permissionRequested');
        return { permissionQueue: [...context.permissionQueue, event.request] };
      },
    ),
    rememberElicitation: assign(
      ({ context, event }): Pick<SessionContext, 'pendingElicitation'> => {
        assertEvent(event, 'agent.elicitationRequested');
        return {
          pendingElicitation: {
            ...event.request,
            requestId: context.input.createId(),
          },
        };
      },
    ),
    answerPermission: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'session.answerPermission');
      const change = permissionOutcomeChange(event.toolCallId, event.optionId);
      enqueue.sendTo('feed', {
        type: feedChangeEvent,
        turnId: context.activeTurnId,
        change,
      });
      enqueue.sendTo('vendorSession', {
        ...event,
        type: answerPermissionCommand,
      } satisfies AgentCommand);
    }),
    removePermission: assign({
      permissionQueue: ({ context }): SessionContext['permissionQueue'] =>
        context.permissionQueue.slice(1),
    }),
    answerElicitation: sendTo(
      'vendorSession',
      ({
        event,
      }): Extract<AgentCommand, { type: typeof answerElicitationCommand }> => {
        assertEvent(event, 'session.answerElicitation');
        return {
          ...event,
          type: answerElicitationCommand,
        } satisfies AgentCommand;
      },
    ),
    removeElicitation: assign({ pendingElicitation: null }),
    cancelRequests: enqueueActions(({ context, enqueue }): void => {
      for (const request of context.permissionQueue) {
        const change = permissionOutcomeChange(request.toolCallId, null);
        enqueue.sendTo('feed', {
          type: feedChangeEvent,
          turnId: context.activeTurnId,
          change,
        });
        enqueue.sendTo('vendorSession', {
          type: answerPermissionCommand,
          toolCallId: request.toolCallId,
          optionId: null,
        } satisfies AgentCommand);
      }
      if (context.pendingElicitation)
        enqueue.sendTo('vendorSession', {
          type: answerElicitationCommand,
          action: 'cancel',
        } satisfies AgentCommand);
      enqueue.assign({ permissionQueue: [], pendingElicitation: null });
    }),
    cancelAgent: sendTo('vendorSession', {
      type: 'agent.cancel',
    } satisfies AgentCommand),
    recordCrash: enqueueActions(({ context, enqueue }): void => {
      const now = context.input.now();
      const agentCrashes = [
        ...context.agentCrashes.filter(
          (at): boolean => at > now - crashWindowMs,
        ),
        now,
      ];
      enqueue.assign({ agentCrashes });
      enqueue.sendTo('feed', {
        type: feedChangeEvent,
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
    giveUp: enqueueActions(({ context, enqueue }): void => {
      const failure = 'The Agent stopped three times in ten minutes';
      enqueue.assign({ failure });
      enqueue.sendTo(writer, {
        type: writeFeedEvent,
        job: {
          type: 'sessionRowUpdate',
          id: context.sessionId,
          set: { failure },
        },
      });
    }),
    countRejectedMessage: assign({
      rejectedMessages: ({ context }): number =>
        countRejection(context.rejectedMessages),
    }),
    messageRejectedNotice: sendTo(
      'feed',
      ({ context, event }): FeedChangeEvent => {
        assertEvent(event, rejectedMessageEvent);
        return {
          type: feedChangeEvent,
          turnId: context.activeTurnId,
          change: {
            type: 'upsert',
            update: {
              id: context.input.createId(),
              sessionUpdate: 'notice',
              state: 'settled',
              severity: 'warning',
              title: 'The Agent sent an unrecognised message',
              description: event.reason,
            },
          },
        };
      },
    ),
    logMessageRejected: ({ context, event }): void => {
      assertEvent(event, rejectedMessageEvent);
      console.error(
        `session ${context.sessionId}: rejected an Agent message: ${event.reason}`,
      );
    },
    cancelNotice: sendTo('feed', ({ context }): FeedChangeEvent => ({
      type: feedChangeEvent,
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
    isNew: ({ context }): boolean => context.input.kind === 'new',
    isUnstored: ({ context }): boolean => !context.stored,
    isPermissionHead: ({ context, event }): boolean =>
      event.type === 'session.answerPermission' &&
      context.permissionQueue[0]?.toolCallId === event.toolCallId,
    hasPermission: ({ context }): boolean => context.permissionQueue.length > 0,
    hasElicitation: ({ context }): boolean =>
      context.pendingElicitation !== null,
    nativeAlreadyDrained: stateIn({ open: 'flushing' }),
    tooManyCrashes: ({ context }): boolean =>
      context.agentCrashes.length >= maxCrashesInWindow,
  },
  delays: {
    checkoutLimit,
    agentStartLimit,
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
      params: ({
        event,
      }: {
        event: { output: SessionData };
      }): SessionDataParameters => ({
        data: event.output,
      }),
    },
  },
  onError: {
    target: 'closed',
    actions: {
      type: 'rememberFailure',
      params: ({
        event,
      }: {
        event: { error: unknown };
      }): FailureParameters => ({
        error: event.error,
      }),
    },
  },
} as const;

// The prompt that `session.new` carried in; only a new Session is ever unstored.
const firstTurn = ({
  context,
}: {
  context: SessionContext;
}): StartTurnParameters => {
  if (context.input.kind !== 'new')
    throw new Error('Only a new Session has a first Turn');
  return { turnId: context.input.turnId, content: context.input.prompt };
};

const toPromptTurn = ({
  event,
}: {
  event: Extract<SessionCommand, { type: 'session.prompt' }>;
}): StartTurnParameters => ({ turnId: event.turnId, content: event.content });

// An Agent that ends before its Session is stored discards the Session; a stored one recovers.
const nativeFailed = [
  {
    guard: 'isUnstored',
    target: drainingNativeTarget,
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
  }): EndTurnParameters => ({
    stopReason: event.stopReason,
    usage: event.usage,
    error: event.error,
  }),
} as const;

export const sessionMachine = sessionSetup.createMachine({
  id: 'session',
  context: ({ input }): SessionContext => ({
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
    heldConfigValues: [],
    agentCrashes: [],
    rejectedMessages: 0,
    failure: null,
    pendingNativeStops: new Set(),
    stored: input.kind === 'existing',
  }),
  output: ({ context }): Pick<SessionContext, 'failure'> => ({
    failure: context.failure,
  }),
  initial: 'entering',
  states: {
    entering: {
      always: [{ guard: 'isNew', target: 'creating' }, { target: 'loading' }],
    },
    creating: {
      after: {
        checkoutLimit: {
          target: 'closed',
          actions: {
            type: 'rememberFailure',
            params: {
              error: `Checkout creation exceeded checkoutLimit (${checkoutLimit} ms). Retry the Session.`,
            },
          },
        },
      },
      invoke: {
        id: 'createCheckout',
        src: 'createCheckout',
        input: ({ context }): NewSessionInput =>
          context.input as NewSessionInput,
        ...sessionEntryOutcome,
      },
    },
    loading: {
      invoke: {
        id: 'loadSession',
        src: 'loadSession',
        input: ({ context, self }): LoadSessionInput => ({
          session: context.input,
          writer: findDatabaseWriter(self.system),
        }),
        ...sessionEntryOutcome,
      },
    },
    open: {
      invoke: {
        id: 'feed',
        src: 'feed',
        input: ({
          context,
          self,
        }): import('xstate').InputFrom<typeof feedMachine> => ({
          sessionId: context.sessionId,
          epoch: context.epoch,
          maxRevision: context.maxRevision,
          activityAt: context.activityAt,
          nextPosition: context.nextPosition,
          now: context.input.now,
          findWrittenRow: (id): ReturnType<typeof readWrittenRow> =>
            readWrittenRow({
              database: context.input.database,
              writer: findDatabaseWriter(self.system),
              sessionId: context.sessionId,
              id,
            }),
        }),
        onDone: [
          { guard: 'nativeAlreadyDrained', target: 'closed' },
          { target: 'stopping' },
        ],
        onError: [
          {
            guard: 'nativeAlreadyDrained',
            target: 'closed',
            actions: {
              type: 'rememberFailure',
              params: ({ event }): FailureParameters => ({
                error: event.error,
              }),
            },
          },
          {
            target: 'stopping',
            actions: {
              type: 'rememberFailure',
              params: ({ event }): FailureParameters => ({
                error: event.error,
              }),
            },
          },
        ],
      },
      initial: 'live',
      states: {
        live: {
          invoke: {
            id: 'vendorSession',
            src: 'vendorSession',
            input: ({ context }): NativeSessionInput => ({
              adapter: context.input.adapter,
              sessionId: context.sessionId,
              cwd: context.checkout.path,
              vendorSessionId: context.vendorSessionId,
              configOptions: context.configValues,
              pendingNativeStops: context.pendingNativeStops,
            }),
            onError: nativeFailed,
          },
          initial: 'starting',
          on: {
            'agent.feed': { actions: 'forwardFeed' },
            [rejectedMessageEvent]: {
              actions: [
                'countRejectedMessage',
                'messageRejectedNotice',
                'logMessageRejected',
              ],
            },
            'agent.usage': { actions: 'rememberUsage' },
            'agent.configOptionsChanged': { actions: 'rememberConfig' },
            [nativeFailedEvent]: nativeFailed,
            'session.close': { target: '.closing' },
          },
          states: {
            starting: {
              after: {
                agentStartLimit: [
                  {
                    guard: 'isUnstored',
                    target: drainingNativeTarget,
                    actions: ['rememberStartLimit', 'refreshAgentProbe'],
                  },
                  {
                    target: '#session.open.recovering',
                    actions: [
                      'recordCrash',
                      { type: 'endTurn', params: { stopReason: 'error' } },
                    ],
                  },
                ],
              },
              on: {
                'agent.ready': [
                  {
                    guard: 'isUnstored',
                    target: 'running',
                    actions: [
                      'rememberReady',
                      'storeSession',
                      { type: 'persistTurn', params: firstTurn },
                      { type: 'startTurn', params: firstTurn },
                    ],
                  },
                  { target: 'idle', actions: 'rememberReady' },
                ],
                'session.close': {
                  guard: 'isUnstored',
                  target: drainingNativeTarget,
                  actions: 'rememberStartFailure',
                },
              },
            },
            idle: {
              on: {
                'agent.turnStarted': {
                  target: 'running',
                  actions: {
                    type: 'persistTurn',
                    params: ({
                      context,
                    }): Pick<StartTurnParameters, 'turnId'> => ({
                      turnId: context.input.createId(),
                    }),
                  },
                },
                'session.prompt': {
                  target: 'running',
                  actions: [
                    { type: 'persistTurn', params: toPromptTurn },
                    { type: 'startTurn', params: toPromptTurn },
                  ],
                },
                'session.setConfigOption': { actions: 'forwardConfig' },
              },
            },
            running: {
              initial: 'working',
              on: {
                'session.setConfigOption': { actions: 'holdConfig' },
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
              on: {
                'session.setConfigOption': { actions: 'holdConfig' },
                'agent.turnEnded': { target: 'idle', actions: endedTurn },
              },
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
              ],
              always: drainingNativeTarget,
            },
          },
        },
        recovering: {
          always: {
            guard: 'tooManyCrashes',
            target: 'draining',
            actions: 'giveUp',
          },
          after: { agentRestartDelay: 'live' },
          on: { 'session.close': 'draining' },
        },
        draining: {
          invoke: {
            id: 'drainNative',
            src: 'drainNative',
            input: ({ context }): SessionContext['pendingNativeStops'] =>
              context.pendingNativeStops,
            onDone: [
              { guard: 'isUnstored', target: '#session.discarding' },
              { target: 'flushing' },
            ],
          },
          after: {
            agentStopLimit: [
              { guard: 'isUnstored', target: '#session.discarding' },
              { target: 'flushing' },
            ],
          },
        },
        flushing: {
          entry: 'flushFeed',
          after: { feedFlushLimit: '#session.closed' },
        },
      },
    },
    stopping: {
      invoke: {
        id: 'drainNative',
        src: 'drainNative',
        input: ({ context }): SessionContext['pendingNativeStops'] =>
          context.pendingNativeStops,
        onDone: [
          { guard: 'isUnstored', target: 'discarding' },
          { target: 'closed' },
        ],
      },
      after: {
        agentStopLimit: [
          { guard: 'isUnstored', target: 'discarding' },
          { target: 'closed' },
        ],
      },
    },
    // A new Session whose Agent never started leaves no worktree behind.
    discarding: {
      invoke: {
        id: 'discardCheckout',
        src: 'discardCheckout',
        input: ({ context }): DiscardCheckoutInput => ({
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

function chooseConfigValue(
  options: SessionConfigOption[],
  choice: AgentConfigValue,
  held: boolean,
): SessionConfigOption[] {
  return options.map((option): SessionConfigOption => {
    if (option.configId !== choice.configId) return option;
    const _meta = {
      ...option._meta,
      argo: { ...option._meta?.argo, heldUntilNextTurn: held },
    };
    if (option.type === 'boolean')
      return typeof choice.value === 'boolean'
        ? { ...option, currentValue: choice.value, _meta }
        : option;
    return typeof choice.value === 'string'
      ? { ...option, currentValue: choice.value, _meta }
      : option;
  });
}

function keepHeldConfigChoices(
  options: SessionConfigOption[],
  held: AgentConfigValue[],
): SessionConfigOption[] {
  return held.reduce(
    (current, choice): SessionConfigOption[] =>
      chooseConfigValue(current, choice, true),
    options,
  );
}
