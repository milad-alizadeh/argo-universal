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
  type AnyActorRef,
  type InputFrom,
} from 'xstate';
import { countRejection } from '../../lib/count-rejections';
import { createRejectionCounter } from '../../lib/count-rejections';
import { findAgentProbe } from '../agents';
import type { AcpSessionLease } from '../agents';
import { createAcpResponseReaders } from '../agents';
import { blobsFolderIn } from '../blob';
import {
  findDatabaseWriter,
  publishTurnContent,
  type FeedEvent,
  type FeedActorRef,
} from '../feed';
import { userMessageChange } from '../feed';
import { feedMachine } from '../feed';
import { readWrittenRow, readUnaddressedPlan } from '../feed';
import type { writerMachine } from '../feed';
import {
  AcpSessionLifetime,
  type AcpLifetimeEvent,
  type AcpSessionDependencies,
} from './conversation/acp-lifetime';
import {
  commitLocalPrompt,
  type LocalSubmission,
} from './conversation/submission';
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

type FeedChangeEvent = Extract<FeedEvent, { type: 'feed.change' }>;
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

// The registry passes the adapter for the Session's Agent.
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
  | AcpLifetimeEvent
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
  elicitationQueue: PendingElicitation[];
  configOptions: SessionConfigOption[];
  heldConfigValues: AgentConfigValue[];
  agentCrashes: number[];
  rejectedMessages: number;
  failure: string | null;
  pendingNativeStops: Set<Promise<void>>;
  // False for a new Session until its Agent is ready and its row is written.
  stored: boolean;
  acpLifetime: AcpSessionLifetime;
  acpLease: AcpSessionLease | null;
  pendingSubmission: LocalSubmission | null;
  acpPrompt: PromptRequest | null;
  acpResponseReaders: ReturnType<typeof createAcpResponseReaders>;
  acpTurnOutcome: EndTurnParameters | null;
  feedEnded: boolean;
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
  system: AnyActorRef['system'];
  self: AnyActorRef;
}): AnyActorRef => findDatabaseWriter(system) ?? self;

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
    change: permissionOutcomeChange(request.toolCallId, null),
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
    openAcp: fromPromise<AcpSessionLease, SessionContext>(({ input }) =>
      input.acpLifetime.open(input),
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
    forwardAcpUpdate: sendTo(
      'feed',
      ({ context, event }): Extract<FeedEvent, { type: 'feed.acpUpdate' }> => {
        assertEvent(event, 'acp.update');
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
        lease: AcpSessionLease,
      ): Pick<SessionContext, 'acpLease' | 'vendorSessionId'> => ({
        acpLease: lease,
        vendorSessionId: lease.sessionId,
      }),
    ),
    rememberAcpFailure: assign(({ event }): Pick<SessionContext, 'failure'> => {
      assertEvent(event, 'acp.failed');
      return { failure: String(event.error) };
    }),
    rememberSession: assign(
      (_, params: SessionDataParameters): SessionData => params.data,
    ),
    rememberFeedEnded: assign({ feedEnded: true }),
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
    // The Agent must be ready before the Session row is written.
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
          elicitationQueue: [],
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
        return {
          type: feedChangeEvent,
          turnId: context.activeTurnId,
          change: permissionOutcomeChange(request.toolCallId, event.optionId),
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
    usesAcp: ({ context }): boolean =>
      context.input.acp !== undefined ||
      (context.input.kind === 'new' && context.input.prompt.length === 0),
    isNew: ({ context }): boolean => context.input.kind === 'new',
    isUnstored: ({ context }): boolean => !context.stored,
    hasEndedFeed: ({ context }): boolean => context.feedEnded,
    isPermissionHead: ({ context, event }): boolean =>
      event.type === answerPermissionEvent &&
      context.permissionQueue[0]?.requestId === event.requestId,
    hasPermission: ({ context }): boolean => context.permissionQueue.length > 0,
    hasElicitation: ({ context }): boolean =>
      context.elicitationQueue.length > 0,
    isPendingElicitation: ({ context, event }): boolean =>
      event.type === answerElicitationEvent &&
      context.elicitationQueue[0]?.requestId === event.requestId,
    nativeAlreadyDrained: or([
      stateIn({ open: 'flushing' }),
      stateIn({ open: { acp: 'flushing' } }),
    ]),
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

const acpReleaseTransitions = [
  {
    guard: 'isUnstored',
    target: discardingSessionTarget,
    actions: {
      type: 'endTurn',
      params: { stopReason: 'cancelled' },
    },
  },
  {
    guard: 'hasEndedFeed',
    target: closedSessionTarget,
    actions: {
      type: 'endTurn',
      params: { stopReason: 'cancelled' },
    },
  },
  {
    target: 'flushing',
    actions: {
      type: 'endTurn',
      params: { stopReason: 'cancelled' },
    },
  },
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
    acpLifetime: new AcpSessionLifetime(input.acp, input.createId),
    acpLease: null,
    pendingSubmission: null,
    feedEnded: false,
    acpPrompt: null,
    acpResponseReaders: createAcpResponseReaders(
      createRejectionCounter(`ACP Session ${input.sessionId}`),
    ),
    acpTurnOutcome: null,
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
              writer: findDatabaseWriter(self.system),
              sessionId: context.sessionId,
              id,
            }),
          findUnaddressedPlan: (
            acpSessionId,
          ): ReturnType<typeof readUnaddressedPlan> =>
            readUnaddressedPlan({
              database: context.input.database,
              writer: findDatabaseWriter(self.system),
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
            'acp.update': { actions: 'forwardAcpUpdate' },
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
                      params: ({ event }): AcpSessionLease => event.output,
                    },
                    'storeSession',
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
              on: { 'session.close': { target: 'closing' } },
            },
            idle: {
              on: {
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
                    params: ({ event }) => event.output,
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
              },
            },
            publishing: {
              invoke: {
                id: 'publishTurn',
                src: 'publishTurn',
                input: ({ context, self }): AcpOperationInput => ({
                  context,
                  findFeed: () => self.getSnapshot().children.feed,
                }),
                onDone: {
                  target: 'idle',
                  actions: {
                    type: 'endTurn',
                    params: ({ context }) =>
                      context.acpTurnOutcome ?? { stopReason: 'error' },
                  },
                },
                onError: {
                  target: 'closing',
                  actions: {
                    type: 'rememberFailure',
                    params: ({ event }) => ({ error: event.error }),
                  },
                },
              },
            },
            closing: {
              entry: {
                type: 'rejectSubmission',
                params: {
                  error: new Error(
                    'The prompt could not be saved; no Agent work was started',
                  ),
                },
              },
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
              after: { feedFlushLimit: closedSessionTarget },
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
              { guard: 'isUnstored', target: discardingSessionTarget },
              { target: 'flushing' },
            ],
          },
          after: {
            agentStopLimit: [
              { guard: 'isUnstored', target: discardingSessionTarget },
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
