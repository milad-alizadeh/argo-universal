import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';
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
import { countRejection } from '@repo/machine-log';
import { createRejectionCounter } from '@repo/machine-log';
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
  or,
  and,
  type AnyActorRef,
  type InputFrom,
} from 'xstate';
import { RecoveryBlockedError } from '../acp';
import type { AcpSessionLease } from '../acp';
import { createAcpResponseReaders } from '../acp';
import { agentProbeId, agentProbeMachine } from '../agents';
import { blobsFolderIn } from '../blob';
import {
  acpToolCallRowId,
  readQueuedFeedRow,
  publishTurnContent,
  type FeedEvent,
  type FeedActorRef,
} from '../feed';
import { userMessageChange } from '../feed';
import { feedMachine } from '../feed';
import { readWrittenRow, readUnaddressedPlan } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import {
  databaseWriterId,
  type WriterActorRef,
  writerMachine,
} from '../storage';
import { readAcpConfiguration } from './acp/acp-configuration';
import {
  AcpSessionLifetime,
  type AcpLifetimeEvent,
  type AcpSessionDependencies,
} from './acp/acp-lifetime';
import { commitLocalPrompt, type LocalSubmission } from './acp/submission';
import {
  admitsPermissionAnswer,
  answeredRequest,
  chosenOption,
} from './admission/answer-admission';
import { hasConfigurationCapacity } from './admission/config-admission';
import { isReplayedHistory } from './admission/update-admission';
import { type ClosureStep, nextClosureStep } from './closure/closure-step';
import {
  addCrash,
  crashBudgetFailure,
  exceedsCrashBudget,
} from './closure/crash-budget';
import {
  chooseConfigValue,
  currentModel,
  holdConfigChoice,
  keepHeldConfigChoices,
  releaseHeldChoice,
  toConfigValues,
} from './configuration/config-choices';
import { validateConfigChoice } from './session-admission';
import {
  createSessionCheckout,
  discardSessionCheckout,
  loadSession,
  type NewSessionInput,
  type SessionData,
  type SessionInput,
  interruptionDisclosureId,
  toSessionInsert,
} from './session-data';
import {
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from './session-storage';

const setConfigEvent = 'session.setConfigOption';
const nativeFailedEvent = 'native.failed';
const storageFailingEvent = 'session.storageFailing';
const rejectedMessageEvent = 'agent.messageRejected';
const closedSessionTarget = '#session.closed';
const discardingSessionTarget = '#session.discarding';
const drainingNativeTarget = '#session.open.draining';
const acpPermissionEvent = 'acp.permissionRequested';
const acpElicitationEvent = 'acp.elicitationRequested';
const answerPermissionEvent = 'session.answerPermission';
const acpRequestWithdrawnEvent = 'acp.requestWithdrawn';
const answerElicitationEvent = 'session.answerElicitation';
const answerPermissionCommand = 'agent.answerPermission';
const answerElicitationCommand = 'agent.answerElicitation';
const writeFeedEvent = 'writer.write';
const feedChangeEvent = 'feed.change';
const configuringState = 'configuring';
const acpUpdateEvent = 'acp.update';

type FeedChangeEvent = Extract<FeedEvent, { type: 'feed.change' }>;
type SessionDataParameters = { data: SessionData };
type FailureParameters = { error: unknown };
type CrashNoticeParameters = { description?: string } | undefined;
type LoadSessionInput = {
  session: SessionInput;
  writer: WriterActorRef | undefined;
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
type OpenedAcpSession = {
  lease: AcpSessionLease;
  configOptions: SessionConfigOption[];
};
type AcpOperationInput = {
  context: SessionContext;
  findFeed: () => FeedActorRef | undefined;
};
const publishActiveTurnContent = (input: AcpOperationInput): Promise<void> => {
  if (!input.context.activeTurnId) return Promise.resolve();
  const feed = input.findFeed();
  if (!feed || feed.getSnapshot().status !== 'active') return Promise.resolve();
  return publishTurnContent(feed, input.context.activeTurnId);
};

// The open Sessions machine passes the adapter for the Session's Agent.
export type SessionMachineInput = SessionInput & {
  adapter: AgentAdapter;
  now: () => number;
  createId: () => string;
  acp?: AcpSessionDependencies;
};

export type SessionCommand =
  | ({ type: 'session.prompt' } & LocalSubmission)
  | {
      type: 'session.answerPermission';
      requestId: PendingPermission['requestId'];
      optionId: PendingPermission['options'][number]['optionId'] | null;
      message?: string;
    }
  | {
      type: 'session.answerElicitation';
      requestId: PendingElicitation['requestId'];
      action: 'accept' | 'decline' | 'cancel';
      content?: Record<string, unknown>;
    }
  | {
      type: typeof setConfigEvent;
      configId: string;
      value: string | boolean;
      applied?: PromiseWithResolvers<SessionConfigOption[]>;
    }
  | { type: 'session.cancel' }
  | { type: 'session.close' };

type NativeFailure = { type: typeof nativeFailedEvent; error: unknown };
type SessionEvent =
  | SessionCommand
  | AgentEvent
  | AcpLifetimeEvent
  | NativeFailure
  | { type: typeof storageFailingEvent }
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
  elicitationQueue: PendingElicitation[];
  configOptions: SessionConfigOption[];
  heldConfigValues: AgentConfigValue[];
  agentCrashes: number[];
  rejectedMessages: number;
  failure: string | null;
  pendingNativeStops: Set<Promise<void>>;
  // False for a new Session until its Agent is ready and its row is written.
  stored: boolean;
  sessionInsertCommitted: Promise<'committed' | 'retrying' | 'failed'> | null;
  acpLifetime: AcpSessionLifetime;
  acpLease: AcpSessionLease | null;
  pendingSubmission: LocalSubmission | null;
  acpPrompt: PromptRequest | null;
  acpResponseReaders: ReturnType<typeof createAcpResponseReaders>;
  acpConfigurationRejections: ReturnType<typeof createRejectionCounter>;
  acpTurnOutcome: EndTurnParameters | null;
  configQueue: Extract<SessionCommand, { type: typeof setConfigEvent }>[];
  applyingConfig: Extract<
    SessionCommand,
    { type: typeof setConfigEvent }
  > | null;
  feedEnded: boolean;
  // The database writer refused this Turn's Feed rows, so the Turn is cancelled and ends with a storage error.
  storageFailedTurn: boolean;
}

const checkoutLimit = 10_000;
const agentStartLimit = 10_000;

const interruptedTurn = (message: string): EndTurnParameters => ({
  stopReason: 'error',
  error: { code: 'interrupted', message },
});
const storageFailedTurn = interruptedTurn(
  'Storage is failing, so the Turn was cancelled',
);
const connectionLostDuringTurn = interruptedTurn(
  'The Agent connection failed during the Turn',
);
const connectionLostBeforePrompt =
  'The Agent connection failed before the prompt was sent';
const interruptionDisclosure = (turnId: string): FeedChange => ({
  type: 'upsert',
  update: {
    id: interruptionDisclosureId(turnId),
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'warning',
    title: 'Output may be missing',
    description:
      'The Turn was interrupted, so its output may be missing. Argo did not resend the prompt.',
  },
});

const writer = ({
  system,
  self,
}: {
  system: AnyActorRef['system'];
  self: AnyActorRef;
}): AnyActorRef =>
  findMachineActor(system, databaseWriterId, writerMachine) ?? self;

// A native Tool call's row is named by its id; an ACP one's is scoped to its ACP session.
const permissionOutcomeChange = (
  context: SessionContext,
  toolCallId: string,
  option: PendingPermission['options'][number] | null,
): FeedChange => ({
  type: 'patch',
  id: context.acpLease
    ? acpToolCallRowId(context.acpLease.sessionId, toolCallId)
    : toolCallId,
  set: {
    _meta: {
      argo: {
        permissionOutcome:
          option === null
            ? { outcome: 'cancelled' }
            : { outcome: 'selected', ...option },
      },
    },
  },
});

const readConfigurationUpdate = (
  context: SessionContext,
  event: SessionEvent,
): SessionConfigOption[] | undefined => {
  assertEvent(event, acpUpdateEvent);
  const update = event.notification.update;
  if (update.sessionUpdate !== 'config_option_update') return undefined;
  try {
    return readAcpConfiguration(
      update.configOptions,
      context.acpConfigurationRejections,
    );
  } catch {
    return undefined;
  }
};

const headPermission = (context: SessionContext): PendingPermission => {
  const request = context.permissionQueue[0];
  if (!request) throw new Error('No Permission request to answer');
  return request;
};

// Each cancelled Permission request shows its outcome on its Tool call.
const cancelledPermissions = (
  context: SessionContext,
  requests: readonly PendingPermission[],
): FeedChangeEvent[] =>
  requests.map((request): FeedChangeEvent => ({
    type: feedChangeEvent,
    turnId: context.activeTurnId,
    change: permissionOutcomeChange(context, request.toolCallId, null),
  }));

const sessionSetup = setup({
  types: {
    input: {} as SessionMachineInput,
    children: {} as { feed: 'feed' },
    context: {} as SessionContext,
    events: {} as SessionEvent,
    output: {} as Pick<SessionContext, 'failure'>,
  },
  actors: {
    cancelAcp: fromPromise<void, SessionContext>(({ input }) => {
      if (!input.acpLease) throw new Error('No active ACP Session');
      return input.acpLease.agent.notify('session/cancel', {
        sessionId: input.acpLease.sessionId,
      });
    }),
    configureAcp: fromPromise<SessionConfigOption[], SessionContext>(
      async ({ input }) => {
        const { acpLease, applyingConfig } = input;
        if (!acpLease || !applyingConfig)
          throw new Error('No Session configuration operation');
        const { configId, value } = applyingConfig;
        validateConfigChoice(input.configOptions, applyingConfig);
        const response = input.acpResponseReaders[
          'session/set_config_option'
        ].parse(
          await acpLease.agent.request<unknown>('session/set_config_option', {
            sessionId: acpLease.sessionId,
            configId,
            value,
            ...(typeof value === 'boolean' && { type: 'boolean' }),
          }),
        );
        return readAcpConfiguration(
          response.configOptions,
          input.acpConfigurationRejections,
        );
      },
    ),
    publishTurn: fromPromise<void, AcpOperationInput>(({ input }) => {
      const feed = input.findFeed();
      if (!feed || !input.context.activeTurnId)
        throw new Error('No finishing Turn Feed');
      return publishTurnContent(feed, input.context.activeTurnId);
    }),
    commitPrompt: fromPromise<PromptRequest, AcpOperationInput>(
      ({ input, signal }) => {
        const {
          pendingSubmission,
          acpLease,
          input: sessionInput,
        } = input.context;
        const feed = input.findFeed();
        if (!pendingSubmission || !acpLease || !feed)
          throw new Error('No Session submission destination');
        return commitLocalPrompt(
          {
            submission: pendingSubmission,
            lease: acpLease,
            feed,
            storage: {
              database: sessionInput.database,
              blobsFolder: blobsFolderIn(sessionInput.runtimeDirectory),
            },
          },
          signal,
        );
      },
    ),
    promptAcp: fromPromise<PromptResponse, SessionContext>(
      async ({ input }) => {
        if (!input.acpLease || !input.acpPrompt)
          throw new Error('No admitted ACP prompt');
        return input.acpResponseReaders['session/prompt'].parse(
          await input.acpLease.agent.request<unknown>(
            'session/prompt',
            input.acpPrompt,
          ),
        );
      },
    ),
    acpSubscription: fromCallback<
      AcpLifetimeEvent,
      AcpSessionLifetime,
      AcpLifetimeEvent
    >(({ input, sendBack }) => input.bind(sendBack)),
    openAcp: fromPromise<OpenedAcpSession, SessionContext>(
      async ({ input }) => {
        const lease = await input.acpLifetime.open(input);
        return {
          lease,
          configOptions: readAcpConfiguration(
            lease.response.configOptions,
            input.acpConfigurationRejections,
          ),
        };
      },
    ),
    reopenAcp: fromPromise<OpenedAcpSession, SessionContext>(
      async ({ input }) => {
        const lease = await input.acpLifetime.reopen(input);
        return {
          lease,
          configOptions: readAcpConfiguration(
            lease.response.configOptions,
            input.acpConfigurationRejections,
          ),
        };
      },
    ),
    closeAcp: fromPromise<void, AcpOperationInput>(async ({ input }) => {
      await input.context.acpLifetime.close();
      await publishActiveTurnContent(input);
    }),
    awaitAcpRelease: fromPromise<void, AcpOperationInput>(async ({ input }) => {
      await input.context.acpLifetime.waitForRelease();
      await publishActiveTurnContent(input);
    }),
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
    queueAcpConfig: assign(({ context, event }) => {
      assertEvent(event, setConfigEvent);
      return { configQueue: [...context.configQueue, event] };
    }),
    takeAcpConfig: assign(({ context }) => ({
      applyingConfig: context.configQueue[0] ?? null,
      configQueue: context.configQueue.slice(1),
    })),
    applyAcpConfig: enqueueActions(
      ({ context, event, enqueue }, options?: SessionConfigOption[]) => {
        const nextOptions = options ?? readConfigurationUpdate(context, event);
        if (!nextOptions) return;
        const configValues = toConfigValues(nextOptions);
        enqueue.assign({
          configOptions: nextOptions,
          configValues,
        });
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
          job: new SessionRowUpdateJob({
            id: context.sessionId,
            set: { configValues },
          }),
        });
      },
    ),
    acknowledgeAcpConfig: assign(({ context }) => {
      context.applyingConfig?.applied?.resolve(context.configOptions);
      return { applyingConfig: null };
    }),
    rejectAcpConfig: assign(({ context }, params: FailureParameters) => {
      context.applyingConfig?.applied?.reject(params.error);
      return { applyingConfig: null };
    }),
    rejectPendingAcpConfig: assign(({ context }) => {
      const error = new Error('Session closed before configuration completed');
      context.applyingConfig?.applied?.reject(error);
      for (const config of context.configQueue) config.applied?.reject(error);
      return { configQueue: [], applyingConfig: null };
    }),
    forwardAcpUpdate: sendTo(
      'feed',
      ({ context, event }): Extract<FeedEvent, { type: 'feed.acpUpdate' }> => {
        assertEvent(event, acpUpdateEvent);
        return {
          type: 'feed.acpUpdate',
          acpSessionId: event.notification.sessionId,
          update: event.notification.update,
          turnId: context.activeTurnId,
        };
      },
    ),
    rememberAcpOutcome: assign(
      (
        _,
        outcome: EndTurnParameters,
      ): Pick<SessionContext, 'acpTurnOutcome'> => ({
        acpTurnOutcome: outcome,
      }),
    ),
    rememberSubmission: assign(
      ({ event }): Pick<SessionContext, 'pendingSubmission'> => {
        assertEvent(event, 'session.prompt');
        return { pendingSubmission: event };
      },
    ),
    acknowledgeLocalPromptCommit: assign(
      (
        { context },
        prompt: PromptRequest,
      ): Pick<SessionContext, 'acpPrompt' | 'pendingSubmission'> => {
        context.pendingSubmission?.committed?.resolve();
        return {
          acpPrompt: prompt,
          pendingSubmission: context.pendingSubmission && {
            ...context.pendingSubmission,
            committed: undefined,
          },
        };
      },
    ),
    rejectSubmission: assign(
      (
        { context },
        params: FailureParameters,
      ): Pick<SessionContext, 'pendingSubmission'> => {
        context.pendingSubmission?.committed?.reject(params.error);
        return { pendingSubmission: null };
      },
    ),
    rememberAcpLease: assign(
      (
        _,
        { lease, configOptions }: OpenedAcpSession,
      ): Pick<
        SessionContext,
        'acpLease' | 'vendorSessionId' | 'configOptions' | 'configValues'
      > => {
        return {
          acpLease: lease,
          vendorSessionId: lease.sessionId,
          configOptions,
          configValues: toConfigValues(configOptions),
        };
      },
    ),
    rememberAcpFailure: assign(({ event }): Pick<SessionContext, 'failure'> => {
      assertEvent(event, 'acp.failed');
      return { failure: String(event.error) };
    }),
    rememberSession: assign(
      (_, params: SessionDataParameters): SessionData => params.data,
    ),
    rememberFeedEnded: assign({ feedEnded: true }),
    rememberStorageFailure: assign({ storageFailedTurn: true }),
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
      const probe = findMachineActor(
        system,
        agentProbeId(context.input.adapter.agent),
        agentProbeMachine,
      );
      if (probe) enqueue.sendTo(probe, { type: 'agentProbe.refresh' });
    }),
    rememberReady: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, 'agent.ready');
      if (context.stored)
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
          job: new SessionRowUpdateJob({
            id: context.sessionId,
            set: {
              vendorSessionId: event.vendorSessionId,
              failure: null,
              configValues: toConfigValues(event.configOptions),
            },
          }),
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
    // The Agent must be ready before the Session row is written.
    storeSession: enqueueActions(({ context, enqueue }): void => {
      if (context.input.kind !== 'new') return;
      const committed = Promise.withResolvers<
        'committed' | 'retrying' | 'failed'
      >();
      enqueue.assign({
        stored: true,
        sessionInsertCommitted: committed.promise,
      });
      enqueue.sendTo(writer, {
        type: writeFeedEvent,
        job: toSessionInsert(context.input, context),
        committed: {
          resolve: () => committed.resolve('committed'),
          reject: (_error: unknown, retrying?: boolean) =>
            committed.resolve(retrying ? 'retrying' : 'failed'),
        },
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
          job: new TurnInsertJob({
            turn: {
              id: params.turnId,
              sessionId: context.sessionId,
              startedAt,
              status: 'running',
              model: currentModel(context.configOptions),
            },
          }),
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
      ({ context, enqueue }, ended: EndTurnParameters): void => {
        const params = context.storageFailedTurn ? storageFailedTurn : ended;
        if (context.activeTurnId)
          enqueue.sendTo(writer, {
            type: writeFeedEvent,
            job: new TurnUpdateJob({
              id: context.activeTurnId,
              set: {
                status: 'ended',
                stopReason: params.stopReason,
                endedAt: context.input.now(),
                usage: params.usage ?? null,
                error: params.error ?? null,
              },
            }),
          });
        enqueue.assign({
          activeTurnId: null,
          activeTurnStartedAt: null,
          permissionQueue: [],
          elicitationQueue: [],
          storageFailedTurn: false,
        });
      },
    ),
    forwardFeed: sendTo(
      'feed',
      ({ context, event }): Extract<FeedEvent, { type: 'feed.change' }> => {
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
          job: new SessionRowUpdateJob({
            id: context.sessionId,
            set: { configValues },
          }),
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
      assertEvent(event, setConfigEvent);
      enqueue.assign({
        configOptions: chooseConfigValue(context.configOptions, event, false),
        heldConfigValues: releaseHeldChoice(
          context.heldConfigValues,
          event.configId,
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
        assertEvent(event, setConfigEvent);
        const choice = { configId: event.configId, value: event.value };
        return {
          heldConfigValues: holdConfigChoice(context.heldConfigValues, choice),
          configOptions: chooseConfigValue(context.configOptions, choice, true),
        };
      },
    ),
    queuePermission: assign(
      ({ context, event }): Pick<SessionContext, 'permissionQueue'> => {
        assertEvent(event, ['agent.permissionRequested', acpPermissionEvent]);
        return {
          permissionQueue: [
            ...context.permissionQueue,
            'requestId' in event.request
              ? event.request
              : { ...event.request, requestId: context.input.createId() },
          ],
        };
      },
    ),
    queueElicitation: assign(
      ({ context, event }): Pick<SessionContext, 'elicitationQueue'> => {
        assertEvent(event, ['agent.elicitationRequested', acpElicitationEvent]);
        return {
          elicitationQueue: [
            ...context.elicitationQueue,
            'requestId' in event.request
              ? event.request
              : { ...event.request, requestId: context.input.createId() },
          ],
        };
      },
    ),
    refuseAcpRequest: ({ context, event }): void => {
      assertEvent(event, [acpPermissionEvent, acpElicitationEvent]);
      context.acpLifetime.cancelRequest(event.request.requestId);
    },
    // The Agent withdrew a request: its Tool call shows the cancellation.
    forgetAcpRequest: enqueueActions(({ context, event, enqueue }): void => {
      assertEvent(event, acpRequestWithdrawnEvent);
      const isOther = (request: { requestId: string }): boolean =>
        request.requestId !== event.requestId;
      for (const change of cancelledPermissions(
        context,
        context.permissionQueue.filter((request): boolean => !isOther(request)),
      ))
        enqueue.sendTo('feed', change);
      enqueue.assign({
        permissionQueue: context.permissionQueue.filter(isOther),
        elicitationQueue: context.elicitationQueue.filter(isOther),
      });
    }),
    publishPermissionOutcome: sendTo(
      'feed',
      ({ context, event }): FeedChangeEvent => {
        assertEvent(event, answerPermissionEvent);
        const request = headPermission(context);
        const option = chosenOption(request, event.optionId);
        if (option === undefined)
          throw new Error('The Agent did not offer that option');
        return {
          type: feedChangeEvent,
          turnId: context.activeTurnId,
          change: permissionOutcomeChange(context, request.toolCallId, option),
        };
      },
    ),
    answerPermission: sendTo(
      'vendorSession',
      ({
        context,
        event,
      }): Extract<AgentCommand, { type: typeof answerPermissionCommand }> => {
        assertEvent(event, answerPermissionEvent);
        const request = headPermission(context);
        return {
          type: answerPermissionCommand,
          toolCallId: request.toolCallId,
          optionId: event.optionId,
          ...(event.message === undefined ? {} : { message: event.message }),
        };
      },
    ),
    answerAcpPermission: ({ context, event }): void => {
      assertEvent(event, answerPermissionEvent);
      context.acpLifetime.answerPermission(event.requestId, event.optionId);
    },
    answerAcpElicitation: ({ context, event }): void => {
      assertEvent(event, answerElicitationEvent);
      context.acpLifetime.answerElicitation(
        event.requestId,
        event.action === 'accept'
          ? { action: 'accept', content: event.content ?? {} }
          : { action: event.action },
      );
    },
    removePermission: assign({
      permissionQueue: ({ context }): SessionContext['permissionQueue'] =>
        context.permissionQueue.slice(1),
    }),
    answerElicitation: sendTo(
      'vendorSession',
      ({
        event,
      }): Extract<AgentCommand, { type: typeof answerElicitationCommand }> => {
        assertEvent(event, answerElicitationEvent);
        return {
          type: answerElicitationCommand,
          action: event.action,
          ...(event.content === undefined ? {} : { content: event.content }),
        } satisfies AgentCommand;
      },
    ),
    removeElicitation: assign({
      elicitationQueue: ({ context }): SessionContext['elicitationQueue'] =>
        context.elicitationQueue.slice(1),
    }),
    cancelAcpRequests: enqueueActions(({ context, enqueue }): void => {
      context.acpLifetime.cancelRequests();
      for (const change of cancelledPermissions(
        context,
        context.permissionQueue,
      ))
        enqueue.sendTo('feed', change);
      enqueue.assign({ permissionQueue: [], elicitationQueue: [] });
    }),
    cancelRequests: enqueueActions(({ context, enqueue }): void => {
      for (const change of cancelledPermissions(
        context,
        context.permissionQueue,
      ))
        enqueue.sendTo('feed', change);
      for (const request of context.permissionQueue)
        enqueue.sendTo('vendorSession', {
          type: answerPermissionCommand,
          toolCallId: request.toolCallId,
          optionId: null,
        } satisfies AgentCommand);
      const elicitationCancels = context.elicitationQueue.map(
        (): AgentCommand => ({
          type: answerElicitationCommand,
          action: 'cancel',
        }),
      );
      for (const command of elicitationCancels)
        enqueue.sendTo('vendorSession', command);
      enqueue.assign({ permissionQueue: [], elicitationQueue: [] });
    }),
    cancelAgent: sendTo('vendorSession', {
      type: 'agent.cancel',
    } satisfies AgentCommand),
    recordCrash: enqueueActions(
      ({ context, enqueue }, params: CrashNoticeParameters): void => {
        const now = context.input.now();
        const agentCrashes = addCrash(context.agentCrashes, now);
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
              ...params,
            },
          },
        });
      },
    ),
    discloseInterruption: enqueueActions(({ context, enqueue }): void => {
      const turnId =
        context.activeTurnId ?? context.undisclosedInterruptedTurnId;
      if (!turnId) return;
      enqueue.sendTo('feed', {
        type: feedChangeEvent,
        turnId,
        change: interruptionDisclosure(turnId),
      });
      enqueue.assign({ undisclosedInterruptedTurnId: null });
    }),
    storeFailure: enqueueActions(
      ({ context, enqueue }, params: FailureParameters): void => {
        const failure = String(params.error);
        enqueue.assign({ failure });
        enqueue.sendTo(writer, {
          type: writeFeedEvent,
          job: new SessionRowUpdateJob({
            id: context.sessionId,
            set: { failure },
          }),
        });
      },
    ),
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
    isRecoveryBlocked: ({ event }): boolean =>
      'error' in event && event.error instanceof RecoveryBlockedError,
    isReplayedHistory: ({ context, event }): boolean =>
      event.type === acpUpdateEvent &&
      isReplayedHistory(
        context.vendorSessionId,
        event.notification.update.sessionUpdate,
      ),
    hasAcpConfig: ({ context }) => context.configQueue.length > 0,
    hasConfigurationCapacity: ({ context }): boolean =>
      hasConfigurationCapacity(context.configQueue.length),
    acceptsAcpConfig: and([
      'hasConfigurationCapacity',
      or([
        stateIn({ open: { acp: 'idle' } }),
        stateIn({ open: { acp: configuringState } }),
        stateIn({ open: { acp: 'activeTurn' } }),
        stateIn({ open: { acp: 'publishing' } }),
      ]),
    ]),
    usesAcp: ({ context }): boolean =>
      context.input.acp !== undefined ||
      (context.input.kind === 'new' && context.input.prompt.length === 0),
    isNew: ({ context }): boolean => context.input.kind === 'new',
    isUnstored: ({ context }): boolean => !context.stored,
    closesBy: ({ context }, step: ClosureStep): boolean =>
      nextClosureStep(context) === step,
    isPermissionHead: ({ context, event }): boolean =>
      event.type === answerPermissionEvent &&
      admitsPermissionAnswer(context.permissionQueue, event),
    hasPermission: ({ context }): boolean => context.permissionQueue.length > 0,
    hasElicitation: ({ context }): boolean =>
      context.elicitationQueue.length > 0,
    isPendingElicitation: ({ context, event }): boolean =>
      event.type === answerElicitationEvent &&
      answeredRequest(context.elicitationQueue, event.requestId) !== undefined,
    nativeAlreadyDrained: or([
      stateIn({ open: 'flushing' }),
      stateIn({ open: { acp: 'flushing' } }),
    ]),
    lostConnectionWhilePublishing: stateIn({
      open: { acp: { publishing: 'disconnected' } },
    }),
    tooManyCrashes: ({ context }): boolean =>
      exceedsCrashBudget(context.agentCrashes),
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

const acpTurnOutcome = ({
  context,
}: {
  context: SessionContext;
}): EndTurnParameters => context.acpTurnOutcome ?? { stopReason: 'error' };

const toPromptTurn = ({
  event,
}: {
  event: Extract<SessionCommand, { type: 'session.prompt' }>;
}): StartTurnParameters => ({ turnId: event.turnId, content: event.content });

const discardsSession = { type: 'closesBy', params: 'discard' } as const;

// An Agent that ends before its Session is stored discards the Session; a stored one recovers.
const nativeFailed = [
  {
    guard: discardsSession,
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

const cancelledTurn = {
  type: 'endTurn',
  params: { stopReason: 'cancelled' },
} as const;

const acpReleaseTransitions = [
  {
    guard: discardsSession,
    target: discardingSessionTarget,
    actions: cancelledTurn,
  },
  {
    guard: { type: 'closesBy', params: 'close' },
    target: closedSessionTarget,
    actions: cancelledTurn,
  },
  { target: 'flushing', actions: cancelledTurn },
] as const;

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
    undisclosedInterruptedTurnId: null,
    capabilities: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    elicitationQueue: [],
    configOptions: [],
    heldConfigValues: [],
    agentCrashes: [],
    rejectedMessages: 0,
    failure: null,
    pendingNativeStops: new Set(),
    stored: input.kind === 'existing',
    sessionInsertCommitted: null,
    acpLifetime: new AcpSessionLifetime(input.acp, input.createId),
    acpLease: null,
    pendingSubmission: null,
    feedEnded: false,
    acpPrompt: null,
    acpResponseReaders: createAcpResponseReaders(
      createRejectionCounter(`ACP Session ${input.sessionId}`),
    ),
    acpConfigurationRejections: createRejectionCounter(
      `ACP configuration ${input.sessionId}`,
    ),
    acpTurnOutcome: null,
    configQueue: [],
    applyingConfig: null,
    storageFailedTurn: false,
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
          writer: findMachineActor(
            self.system,
            databaseWriterId,
            writerMachine,
          ),
        }),
        ...sessionEntryOutcome,
      },
    },
    open: {
      invoke: {
        id: 'feed',
        src: 'feed',
        input: ({ context, self }): InputFrom<typeof feedMachine> => ({
          sessionId: context.sessionId,
          epoch: context.epoch,
          maxRevision: context.maxRevision,
          activityAt: context.activityAt,
          nextPosition: context.nextPosition,
          now: context.input.now,
          findWrittenRow: (id): ReturnType<typeof readWrittenRow> =>
            readWrittenRow({
              database: context.input.database,
              pending: readQueuedFeedRow(
                findMachineActor(self.system, databaseWriterId, writerMachine),
                { sessionId: context.sessionId, id },
              ),
              sessionId: context.sessionId,
              id,
            }),
          storageFailing: (): void => self.send({ type: storageFailingEvent }),
          findUnaddressedPlan: (
            acpSessionId,
          ): ReturnType<typeof readUnaddressedPlan> =>
            readUnaddressedPlan({
              database: context.input.database,
              writer: findMachineActor(
                self.system,
                databaseWriterId,
                writerMachine,
              ),
              sessionId: context.sessionId,
              acpSessionId,
            }),
        }),
        onDone: [
          { guard: 'nativeAlreadyDrained', target: 'closed' },
          {
            guard: 'usesAcp',
            target: '.acp.closing',
            actions: 'rememberFeedEnded',
          },
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
            guard: 'usesAcp',
            target: '.acp.closing',
            actions: [
              'rememberFeedEnded',
              {
                type: 'rememberFailure',
                params: ({ event }): FailureParameters => ({
                  error: event.error,
                }),
              },
            ],
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
      initial: 'choosing',
      states: {
        choosing: {
          always: [{ guard: 'usesAcp', target: 'acp' }, { target: 'live' }],
        },
        acp: {
          invoke: {
            id: 'acpSubscription',
            src: 'acpSubscription',
            input: ({ context }): AcpSessionLifetime => context.acpLifetime,
          },
          initial: 'opening',
          on: {
            'session.close': { target: '.closing' },
            'acp.failed': { actions: 'rememberAcpFailure' },
            'acp.update': [
              {
                guard: ({ event }): boolean =>
                  event.notification.update.sessionUpdate ===
                  'config_option_update',
                actions: 'applyAcpConfig',
              },
              { actions: 'forwardAcpUpdate' },
            ],
            [setConfigEvent]: {
              guard: 'acceptsAcpConfig',
              actions: 'queueAcpConfig',
            },
            [acpPermissionEvent]: { actions: 'refuseAcpRequest' },
            [acpElicitationEvent]: { actions: 'refuseAcpRequest' },
            [acpRequestWithdrawnEvent]: { actions: 'forgetAcpRequest' },
            [rejectedMessageEvent]: {
              actions: [
                'countRejectedMessage',
                'messageRejectedNotice',
                'logMessageRejected',
              ],
            },
          },
          states: {
            opening: {
              invoke: {
                id: 'openAcp',
                src: 'openAcp',
                input: ({ context }): SessionContext => context,
                onDone: {
                  target: 'idle',
                  actions: [
                    {
                      type: 'rememberAcpLease',
                      params: ({ event }): OpenedAcpSession => event.output,
                    },
                    'storeSession',
                    'discloseInterruption',
                  ],
                },
                onError: {
                  target: 'closing',
                  actions: {
                    type: 'rememberFailure',
                    params: ({ event }): FailureParameters => ({
                      error: event.error,
                    }),
                  },
                },
              },
              on: {
                'session.close': { target: 'closing' },
                'acp.update': { guard: 'isReplayedHistory' },
              },
            },
            idle: {
              always: { guard: 'hasAcpConfig', target: configuringState },
              on: {
                'acp.failed': { target: 'recovering', actions: 'recordCrash' },
                'session.close': { target: 'closing' },
                'session.prompt': {
                  target: 'committing',
                  actions: [
                    'rememberSubmission',
                    { type: 'persistTurn', params: toPromptTurn },
                  ],
                },
              },
            },
            configuring: {
              entry: 'takeAcpConfig',
              invoke: {
                src: 'configureAcp',
                id: 'configureAcp',
                input: ({ context }) => context,
                onDone: {
                  target: 'idle',
                  actions: [
                    {
                      type: 'applyAcpConfig',
                      params: ({ event }): SessionConfigOption[] =>
                        event.output,
                    },
                    'acknowledgeAcpConfig',
                  ],
                },
                onError: {
                  target: 'idle',
                  actions: {
                    type: 'rejectAcpConfig',
                    params: ({ event }) => ({ error: event.error }),
                  },
                },
              },
            },
            committing: {
              invoke: {
                id: 'commitPrompt',
                src: 'commitPrompt',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: {
                  target: 'activeTurn',
                  actions: {
                    type: 'acknowledgeLocalPromptCommit',
                    params: ({ event }): PromptRequest => event.output,
                  },
                },
                onError: {
                  target: 'idle',
                  actions: [
                    {
                      type: 'rejectSubmission',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                    { type: 'endTurn', params: { stopReason: 'error' } },
                  ],
                },
              },
              on: {
                'acp.failed': {
                  target: 'recovering',
                  actions: [
                    'recordCrash',
                    {
                      type: 'rejectSubmission',
                      params: ({ event }): FailureParameters => ({
                        error: new Error(connectionLostBeforePrompt, {
                          cause: event.error,
                        }),
                      }),
                    },
                    { type: 'endTurn', params: { stopReason: 'error' } },
                  ],
                },
                'session.close': {
                  target: 'closing',
                  actions: {
                    type: 'rejectSubmission',
                    params: {
                      error: new Error('Session closed before prompt commit'),
                    },
                  },
                },
              },
            },
            activeTurn: {
              invoke: {
                id: 'promptAcp',
                src: 'promptAcp',
                input: ({ context }) => context,
                onDone: {
                  target: 'publishing',
                  actions: {
                    type: 'rememberAcpOutcome',
                    params: ({ event }) => ({
                      stopReason: event.output.stopReason,
                    }),
                  },
                },
                onError: {
                  target: 'publishing',
                  actions: [
                    {
                      type: 'rememberFailure',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                    {
                      type: 'rememberAcpOutcome',
                      params: { stopReason: 'error' },
                    },
                  ],
                },
              },
              exit: 'cancelAcpRequests',
              on: {
                'acp.failed': {
                  target: 'interrupting',
                  actions: ['recordCrash', 'discloseInterruption'],
                },
                'session.cancel': {
                  target: '.cancelling',
                  actions: 'cancelAcpRequests',
                },
                [acpPermissionEvent]: {
                  target: '.awaitingPermission',
                  actions: 'queuePermission',
                },
                [acpElicitationEvent]: {
                  target: '.awaitingElicitation',
                  actions: 'queueElicitation',
                },
                [acpRequestWithdrawnEvent]: {
                  target: '.working',
                  actions: 'forgetAcpRequest',
                },
                [answerPermissionEvent]: {
                  guard: 'isPermissionHead',
                  target: '.working',
                  actions: [
                    'publishPermissionOutcome',
                    'answerAcpPermission',
                    'removePermission',
                  ],
                },
                [answerElicitationEvent]: {
                  guard: 'isPendingElicitation',
                  target: '.working',
                  actions: ['answerAcpElicitation', 'removeElicitation'],
                },
                [storageFailingEvent]: {
                  target: '.cancelling',
                  actions: ['rememberStorageFailure', 'cancelAcpRequests'],
                },
              },
              initial: 'working',
              states: {
                working: {
                  always: [
                    { guard: 'hasPermission', target: 'awaitingPermission' },
                    { guard: 'hasElicitation', target: 'awaitingElicitation' },
                  ],
                },
                awaitingPermission: {},
                awaitingElicitation: {},
                cancelling: {
                  on: {
                    'session.cancel': {},
                    [storageFailingEvent]: {
                      actions: 'rememberStorageFailure',
                    },
                    [acpPermissionEvent]: { actions: 'refuseAcpRequest' },
                    [acpElicitationEvent]: { actions: 'refuseAcpRequest' },
                    [acpRequestWithdrawnEvent]: { actions: 'forgetAcpRequest' },
                  },
                  invoke: {
                    src: 'cancelAcp',
                    id: 'cancelAcp',
                    input: ({ context }) => context,
                    onError: {
                      actions: {
                        type: 'rememberFailure',
                        params: ({ event }) => ({ error: event.error }),
                      },
                    },
                  },
                },
              },
            },
            publishing: {
              initial: 'connected',
              states: {
                connected: {
                  on: {
                    'acp.failed': {
                      target: 'disconnected',
                      actions: 'recordCrash',
                    },
                  },
                },
                disconnected: { on: { 'acp.failed': {} } },
              },
              invoke: {
                id: 'publishTurn',
                src: 'publishTurn',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: [
                  {
                    guard: 'lostConnectionWhilePublishing',
                    target: 'recovering',
                    actions: { type: 'endTurn', params: acpTurnOutcome },
                  },
                  {
                    target: 'idle',
                    actions: { type: 'endTurn', params: acpTurnOutcome },
                  },
                ],
                onError: {
                  target: 'closing',
                  actions: {
                    type: 'rememberFailure',
                    params: ({ event }) => ({ error: event.error }),
                  },
                },
              },
            },
            interrupting: {
              on: {
                'acp.failed': {},
                'session.close': {
                  target: 'retainingCleanup',
                  actions: {
                    type: 'endTurn',
                    params: connectionLostDuringTurn,
                  },
                },
              },
              invoke: {
                id: 'publishInterruptedTurn',
                src: 'publishTurn',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: {
                  target: 'recovering',
                  actions: {
                    type: 'endTurn',
                    params: connectionLostDuringTurn,
                  },
                },
                onError: {
                  target: 'recovering',
                  actions: {
                    type: 'endTurn',
                    params: connectionLostDuringTurn,
                  },
                },
              },
            },
            // The failed generation is released by its owner; the retry delay is a minimum, not a release proof.
            recovering: {
              always: {
                guard: 'tooManyCrashes',
                target: 'retainingCleanup',
                actions: {
                  type: 'storeFailure',
                  params: { error: crashBudgetFailure },
                },
              },
              after: { agentRestartDelay: 'reopening' },
              on: {
                'acp.failed': {},
                'session.close': { target: 'retainingCleanup' },
              },
            },
            reopening: {
              invoke: {
                id: 'reopenAcp',
                src: 'reopenAcp',
                input: ({ context }): SessionContext => context,
                onDone: {
                  target: 'idle',
                  actions: {
                    type: 'rememberAcpLease',
                    params: ({ event }): OpenedAcpSession => event.output,
                  },
                },
                onError: [
                  {
                    guard: 'isRecoveryBlocked',
                    target: 'retainingCleanup',
                    actions: {
                      type: 'storeFailure',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                  },
                  { target: 'recovering', actions: 'recordCrash' },
                ],
              },
              on: {
                'acp.failed': {},
                'acp.update': { guard: 'isReplayedHistory' },
              },
            },
            closing: {
              entry: [
                'rejectPendingAcpConfig',
                {
                  type: 'rejectSubmission',
                  params: {
                    error: new Error(
                      'The prompt could not be saved; no Agent work was started',
                    ),
                  },
                },
              ],
              on: { 'session.close': {} },
              invoke: {
                id: 'closeAcp',
                src: 'closeAcp',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: acpReleaseTransitions,
                onError: {
                  target: 'retainingCleanup',
                  actions: {
                    type: 'rememberFailure',
                    params: ({ event }): FailureParameters => ({
                      error: event.error,
                    }),
                  },
                },
              },
            },
            retainingCleanup: {
              on: { 'session.close': {} },
              invoke: {
                id: 'awaitAcpRelease',
                src: 'awaitAcpRelease',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: acpReleaseTransitions,
              },
            },
            flushing: {
              on: { 'session.close': {} },
              entry: 'flushFeed',
              after: {
                feedFlushLimit: {
                  target: closedSessionTarget,
                  actions: {
                    type: 'rememberFailure',
                    params: {
                      error: 'The Feed did not flush before the Session closed',
                    },
                  },
                },
              },
            },
          },
        },
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
                    guard: discardsSession,
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
                  guard: discardsSession,
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
                [setConfigEvent]: { actions: 'forwardConfig' },
              },
            },
            running: {
              initial: 'working',
              on: {
                [setConfigEvent]: { actions: 'holdConfig' },
                'agent.permissionRequested': {
                  target: '.awaitingPermission',
                  actions: 'queuePermission',
                },
                'agent.elicitationRequested': {
                  target: '.awaitingElicitation',
                  actions: 'queueElicitation',
                },
                [answerPermissionEvent]: {
                  guard: 'isPermissionHead',
                  target: '.working',
                  actions: [
                    'publishPermissionOutcome',
                    'answerPermission',
                    'removePermission',
                  ],
                },
                [answerElicitationEvent]: {
                  guard: 'isPendingElicitation',
                  target: '.working',
                  actions: ['answerElicitation', 'removeElicitation'],
                },
                'agent.turnEnded': { target: 'idle', actions: endedTurn },
                'session.cancel': { target: 'cancelling' },
                [storageFailingEvent]: {
                  target: 'cancelling',
                  actions: 'rememberStorageFailure',
                },
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
                [setConfigEvent]: { actions: 'holdConfig' },
                'agent.turnEnded': { target: 'idle', actions: endedTurn },
                [storageFailingEvent]: { actions: 'rememberStorageFailure' },
              },
              after: {
                cancelLimit: {
                  target: '#session.open.recovering',
                  actions: ['cancelNotice', cancelledTurn],
                },
              },
            },
            closing: {
              entry: ['cancelRequests', cancelledTurn],
              always: drainingNativeTarget,
            },
          },
        },
        recovering: {
          always: {
            guard: 'tooManyCrashes',
            target: 'draining',
            actions: {
              type: 'storeFailure',
              params: { error: crashBudgetFailure },
            },
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
              { guard: discardsSession, target: discardingSessionTarget },
              { target: 'flushing' },
            ],
          },
          after: {
            agentStopLimit: [
              { guard: discardsSession, target: discardingSessionTarget },
              { target: 'flushing' },
            ],
          },
        },
        flushing: {
          entry: 'flushFeed',
          after: { feedFlushLimit: closedSessionTarget },
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
          { guard: discardsSession, target: 'discarding' },
          { target: 'closed' },
        ],
      },
      after: {
        agentStopLimit: [
          { guard: discardsSession, target: 'discarding' },
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
