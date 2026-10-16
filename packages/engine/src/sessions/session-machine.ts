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
import type { SessionOpenError } from '@repo/contracts';
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
import { AgentProcessExitError } from '../agents';
import type { AcpSessionLease } from '../agents';
import { createAcpResponseReaders } from '../agents';
import { sessionOpenError } from '../agents';
import { attachmentsFolderIn, blobsFolderIn } from '../blob';
import {
  messageRejectedEvent,
  turnEndingEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
  readQueuedFeedRow,
  publishTurnContent,
  type FeedEvent,
  type FeedTurnEnding,
  type FeedActorRef,
} from '../feed';
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
import type { ElicitationAnswerContent } from './acp/elicitation-types';
import type {
  AcpPromptRequest as PromptRequest,
  AcpPromptResponse as PromptResponse,
} from './acp/prompt-types';
import { commitLocalPrompt, type LocalSubmission } from './acp/submission';
import { acpContextUsage, acpTurnUsage } from './acp/usage';
import {
  admitsPermissionAnswer,
  answeredRequest,
  chosenOption,
} from './admission/answer-admission';
import { hasConfigurationCapacity } from './admission/config-admission';
import { isReplayedHistory } from './admission/update-admission';
import {
  saveSessionArchive,
  removeSessionCheckout,
} from './archive/archive-operations';
import { type ClosureStep, nextClosureStep } from './closure/closure-step';
import { currentModel, toConfigValues } from './configuration/config-choices';
import { validateConfigChoice } from './session-admission';
import {
  createSessionCheckout,
  discardSession,
  loadSession,
  type NewSessionInput,
  type SessionData,
  type SessionDiscard,
  type SessionInput,
  toSessionInsert,
} from './session-data';
import {
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from './session-storage';

const setConfigEvent = 'session.setConfigOption';

const storageFailingEvent = 'session.storageFailing';

const rejectedMessageEvent = 'agent.messageRejected';

const closedSessionTarget = '#session.finishing';

const discardingSessionTarget = '#session.discarding';

const acpPermissionEvent = 'acp.permissionRequested';

const acpElicitationEvent = 'acp.elicitationRequested';

const answerPermissionEvent = 'session.answerPermission';

const acpRequestWithdrawnEvent = 'acp.requestWithdrawn';

const answerElicitationEvent = 'session.answerElicitation';

const writeFeedEvent = 'writer.write';

const configuringState = 'configuring';

const acpUpdateEvent = 'acp.update';

type SessionDataParameters = { data: SessionData };

type FailureParameters = { error: unknown };

type CrashNoticeParameters = { duringTurn?: boolean } | undefined;

type LoadSessionInput = {
  session: SessionInput;
  writer: WriterActorRef | undefined;
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

  return publishTurnContent(
    feed,
    input.context.activeTurnId,
    input.context.turnEnding,
  );
};

export type SessionMachineInput = SessionInput & {
  now: () => number;
  createId: () => string;
  acp: AcpSessionDependencies;
  archive?: boolean;
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
      content?: ElicitationAnswerContent;
    }
  | {
      type: typeof setConfigEvent;
      configId: string;
      value: string | boolean;
      applied?: PromiseWithResolvers<SessionConfigOption[]>;
    }
  | { type: 'session.archive' }
  | { type: 'session.unarchive' }
  | { type: 'session.cancel' }
  | { type: 'session.close' };

type SessionEvent =
  | SessionCommand
  | AcpLifetimeEvent
  | { type: typeof storageFailingEvent };

export interface SessionContext extends SessionData {
  input: SessionMachineInput;
  archiveRequested: boolean;
  activeTurnId: string | null;
  // When the running Turn started, in epoch milliseconds.
  activeTurnStartedAt: number | null;
  usage: ContextUsage | null;
  permissionQueue: PendingPermission[];
  elicitationQueue: PendingElicitation[];
  configOptions: SessionConfigOption[];
  rejectedMessages: number;
  failure: string | null;
  openError: SessionOpenError | null;
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
  turnEnding: FeedTurnEnding;
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

const writer = ({
  system,
  self,
}: {
  system: AnyActorRef['system'];
  self: AnyActorRef;
}): AnyActorRef =>
  findMachineActor(system, databaseWriterId, writerMachine) ?? self;

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
): Extract<FeedEvent, { type: 'feed.permissionsCancelled' }> => ({
  type: permissionsCancelledEvent,
  turnId: context.activeTurnId,
  acpSessionId: context.acpLease?.sessionId ?? '',
  toolCallIds: requests.map((request) => request.toolCallId),
});

// The Session's one child actor: its Feed, invoked under the id "feed".
type SessionChildren = { feed: 'feed' };

const sessionSetup = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as SessionMachineInput,
    children: {} as SessionChildren,
    context: {} as SessionContext,
    events: {} as SessionEvent,
    output: {} as Pick<SessionContext, 'failure'>,
  },
  actors: {
    saveArchive: fromPromise<
      void,
      { context: SessionContext; writer: WriterActorRef | undefined }
    >(({ input }) => saveSessionArchive(input.context, input.writer)),
    undoArchive: fromPromise<
      void,
      { context: SessionContext; writer: WriterActorRef | undefined }
    >(({ input }) => saveSessionArchive(input.context, input.writer, null)),
    removeCheckout: fromPromise<void, SessionContext>(({ input, signal }) =>
      removeSessionCheckout(input.input.database, input, signal),
    ),
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

      if (!feed || !input.context.activeTurnId) return Promise.resolve();

      return publishTurnContent(
        feed,
        input.context.activeTurnId,
        input.context.turnEnding,
      );
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
              attachmentsFolder: attachmentsFolderIn(
                sessionInput.runtimeDirectory,
              ),
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
    closeAcp: fromPromise<void, AcpOperationInput>(async ({ input }) => {
      await input.context.acpLifetime.close();
      await publishActiveTurnContent(input);
    }),
    createCheckout: fromPromise<SessionData, NewSessionInput>(
      ({ input, signal }): Promise<SessionData> =>
        createSessionCheckout(input, signal),
    ),
    discardSession: fromPromise<void, SessionDiscard>(
      ({ input, signal }): Promise<void> => discardSession(input, signal),
    ),
    loadSession: fromPromise<SessionData, LoadSessionInput>(
      ({ input }): Promise<SessionData> =>
        loadSession(input.session, input.writer),
    ),
    feed: feedMachine,
  },
  actions: {
    requestArchive: assign({ archiveRequested: true, failure: null }),
    finishAcpRegistration: ({ context }): void =>
      context.acpLifetime.finishRegistration(),
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
    rememberAcpUsage: assign(
      ({ context, event }): Pick<SessionContext, 'usage'> => {
        assertEvent(event, acpUpdateEvent);
        const update = event.notification.update;

        if (update.sessionUpdate !== 'usage_update')
          return { usage: context.usage };

        return {
          usage: acpContextUsage(update, context.acpLease?.initialization),
        };
      },
    ),
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
        { context },
        { lease, configOptions }: OpenedAcpSession,
      ): Pick<
        SessionContext,
        | 'acpLease'
        | 'vendorSessionId'
        | 'configOptions'
        | 'configValues'
        | 'usage'
      > => {
        return {
          acpLease: lease,
          vendorSessionId: lease.sessionId,
          configOptions,
          configValues: toConfigValues(configOptions),
          usage: context.usage
            ? acpContextUsage(context.usage, lease.initialization)
            : null,
        };
      },
    ),
    rememberPromptFailure: assign(({ context }, params: FailureParameters) => ({
      failure:
        context.turnEnding.kind === 'cancel'
          ? context.failure
          : String(params.error),
    })),
    rememberSession: assign(
      (_, params: SessionDataParameters): SessionData => params.data,
    ),
    rememberFeedEnded: assign({ feedEnded: true }),
    storeAcpSession: sendTo(writer, ({ context }) => ({
      type: writeFeedEvent,
      job: new SessionRowUpdateJob({
        id: context.sessionId,
        set: {
          vendorSessionId: context.vendorSessionId,
          configValues: context.configValues,
        },
      }),
    })),
    rememberStorageFailure: assign({ storageFailedTurn: true }),
    rememberFailure: assign(
      (_, params: FailureParameters): Pick<SessionContext, 'failure'> => ({
        failure: String(params.error),
      }),
    ),
    rememberOpenFailure: assign(
      (
        _,
        params: FailureParameters,
      ): Pick<SessionContext, 'failure' | 'openError'> => ({
        failure: String(params.error),
        openError: sessionOpenError(params.error),
      }),
    ),
    recordPromptAuthentication: (
      { context },
      params: FailureParameters,
    ): void => {
      if (context.turnEnding.kind === 'cancel') return;

      context.acpLease?.authentication?.recordRequired(params.error);
    },
    addDiscardFailure: assign(
      ({ context, event }): Pick<SessionContext, 'failure'> => ({
        failure: `${context.failure}\nThe Session was not discarded: ${String('error' in event ? event.error : event)}`,
      }),
    ),
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
          reject: (cause: unknown, retrying?: boolean) =>
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
          turnEnding: { kind: 'completion' },
          kept: true,
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
    queuePermission: assign(
      ({ context, event }): Pick<SessionContext, 'permissionQueue'> => {
        assertEvent(event, acpPermissionEvent);

        return {
          permissionQueue: [...context.permissionQueue, event.request],
        };
      },
    ),
    queueElicitation: assign(
      ({ context, event }): Pick<SessionContext, 'elicitationQueue'> => {
        assertEvent(event, acpElicitationEvent);

        return {
          elicitationQueue: [...context.elicitationQueue, event.request],
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

      enqueue.sendTo(
        'feed',
        cancelledPermissions(
          context,
          context.permissionQueue.filter(
            (request): boolean => !isOther(request),
          ),
        ),
      );
      enqueue.assign({
        permissionQueue: context.permissionQueue.filter(isOther),
        elicitationQueue: context.elicitationQueue.filter(isOther),
      });
    }),
    publishPermissionOutcome: sendTo(
      'feed',
      ({ context, event }): FeedEvent => {
        assertEvent(event, answerPermissionEvent);
        const request = headPermission(context);
        const option = chosenOption(request, event.optionId);

        if (option === undefined)
          throw new Error('The Agent did not offer that option');

        if (option === null) return cancelledPermissions(context, [request]);

        return {
          type: permissionSelectedEvent,
          turnId: context.activeTurnId,
          acpSessionId: context.acpLease?.sessionId ?? '',
          toolCallId: request.toolCallId,
          option,
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
    removeElicitation: assign({
      elicitationQueue: ({ context }): SessionContext['elicitationQueue'] =>
        context.elicitationQueue.slice(1),
    }),
    rememberCancellation: assign({
      turnEnding: ({ context }): FeedTurnEnding => ({
        ...context.turnEnding,
        kind: 'cancel',
      }),
    }),
    publishCancellation: sendTo('feed', ({ context }) => ({
      type: 'feed.completeTurn',
      turnId: context.activeTurnId ?? '',
      ending: context.turnEnding,
      published: {
        resolve: (): void => {},
        reject: (cause: unknown): void =>
          console.error(
            cause instanceof Error
              ? cause.message
              : 'Could not settle cancelled Turn',
          ),
      },
    })),
    cancelAcpRequests: enqueueActions(({ context, enqueue }): void => {
      context.acpLifetime.cancelRequests();
      const pending = context.turnEnding.waitingPermissions?.toolCallIds ?? [];
      enqueue.assign({
        turnEnding: {
          ...context.turnEnding,
          waitingPermissions: {
            acpSessionId: context.acpLease?.sessionId ?? '',
            toolCallIds: [
              ...pending,
              ...context.permissionQueue.map((request) => request.toolCallId),
            ],
          },
        },
        permissionQueue: [],
        elicitationQueue: [],
      });
    }),
    recordCrash: enqueueActions(
      ({ context, event, enqueue }, params: CrashNoticeParameters): void => {
        assertEvent(event, 'acp.failed');
        const error = event.error;

        const ending: Extract<FeedTurnEnding, { kind: 'agent_crash' }> = {
          kind: 'agent_crash',
          occurredAt: context.input.now(),
          title: error instanceof Error ? error.message : String(error),
          description:
            error instanceof AgentProcessExitError
              ? error.stderr || undefined
              : undefined,
        };

        if (params?.duringTurn && context.activeTurnId)
          enqueue.assign({ turnEnding: { ...context.turnEnding, ...ending } });
        else
          enqueue.sendTo('feed', {
            type: turnEndingEvent,
            turnId: context.activeTurnId,
            ending,
          });
      },
    ),
    discloseInterruption: enqueueActions(({ context, enqueue }): void => {
      const turnId = context.undisclosedInterruptedTurnId;

      if (!turnId) return;
      enqueue.sendTo('feed', {
        type: turnEndingEvent,
        turnId,
        ending: { kind: 'interruption' },
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
    messageRejectedNotice: sendTo('feed', ({ context, event }): FeedEvent => {
      assertEvent(event, rejectedMessageEvent);

      return {
        type: messageRejectedEvent,
        turnId: context.activeTurnId,
        reason: event.reason,
      };
    }),
    logMessageRejected: ({ context, event }): void => {
      assertEvent(event, rejectedMessageEvent);
      console.error(
        `session ${context.sessionId}: rejected an Agent message: ${event.reason}`,
      );
    },
    flushFeed: sendTo('feed', { type: 'feed.flush' }),
  },
  guards: {
    isArchiving: ({ context }) => context.archiveRequested,
    canArchive: and([
      ({ context }): boolean => context.kept && context.activeTurnId === null,
      or([
        stateIn({ open: { acp: 'idle' } }),
        stateIn({ open: { acp: 'configuring' } }),
        stateIn({ open: { acp: { activeTurn: 'cancelling' } } }),
      ]),
    ]),
    isConfigUpdate: ({ event }): boolean =>
      event.type === acpUpdateEvent &&
      event.notification.update.sessionUpdate === 'config_option_update',
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
    agentAlreadyDrained: stateIn({ open: { acp: 'flushing' } }),
    lostConnectionWhilePublishing: stateIn({
      open: { acp: { publishing: 'disconnected' } },
    }),
  },
  delays: {
    checkoutLimit,
    checkoutRemovalDelay: 5_000,
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
      type: 'rememberOpenFailure',
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
    archiveRequested: input.archive ?? false,
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
    kept: false,
    undisclosedInterruptedTurnId: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    usage: null,
    permissionQueue: [],
    elicitationQueue: [],
    configOptions: [],
    rejectedMessages: 0,
    failure: null,
    openError: null,
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
    turnEnding: { kind: 'completion' },
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
            type: 'rememberOpenFailure',
            params: {
              error: `Checkout creation exceeded checkoutLimit (${checkoutLimit} ms). Retry the Session.`,
            },
          },
        },
      },
      invoke: {
        id: 'createCheckout',
        src: 'createCheckout',
        // SAFETY: `creating` is entered only through the `isNew` guard, so the input's kind is 'new'.
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
          createId: context.input.createId,
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
          { guard: 'agentAlreadyDrained', target: 'finishing' },
          {
            target: '.acp.closing',
            actions: 'rememberFeedEnded',
          },
        ],
        onError: [
          {
            guard: 'agentAlreadyDrained',
            target: 'finishing',
            actions: {
              type: 'rememberFailure',
              params: ({ event }): FailureParameters => ({
                error: event.error,
              }),
            },
          },
          {
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
        ],
      },
      initial: 'acp',
      states: {
        acp: {
          invoke: {
            id: 'acpSubscription',
            src: 'acpSubscription',
            input: ({ context }): AcpSessionLifetime => context.acpLifetime,
          },
          initial: 'entering',
          on: {
            'session.archive': {
              guard: 'canArchive',
              target: '.archiving',
              actions: 'requestArchive',
            },
            'session.close': { target: '.closing' },
            'acp.failed': { target: '.closing', actions: 'recordCrash' },
            'acp.update': [
              { guard: 'isConfigUpdate', actions: 'applyAcpConfig' },
              {
                guard: ({ event }): boolean =>
                  event.notification.update.sessionUpdate === 'usage_update',
                actions: 'rememberAcpUsage',
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
            entering: {
              always: [
                { guard: 'isArchiving', target: 'archiving' },
                { target: 'opening' },
              ],
            },
            archiving: {
              on: {
                'session.close': {},
                'acp.failed': { actions: 'recordCrash' },
              },
              invoke: {
                id: 'saveArchive',
                src: 'saveArchive',
                input: ({ context, self }) => ({
                  context,
                  writer: findMachineActor(
                    self.system,
                    databaseWriterId,
                    writerMachine,
                  ),
                }),
                onDone: { target: 'closing' },
                onError: {
                  target: 'closing',
                  actions: [
                    assign({ archiveRequested: false }),
                    {
                      type: 'rememberFailure',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                  ],
                },
              },
            },
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
                    'finishAcpRegistration',
                    'storeSession',
                    'storeAcpSession',
                    'discloseInterruption',
                  ],
                },
                onError: {
                  target: 'closing',
                  actions: {
                    type: 'rememberOpenFailure',
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
                'acp.failed': { target: 'closing', actions: 'recordCrash' },
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
                    params: ({ event }): FailureParameters => ({
                      error: event.error,
                    }),
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
                  target: 'closing',
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
                    params: ({ context, event }) => ({
                      stopReason:
                        context.turnEnding.kind === 'cancel'
                          ? 'cancelled'
                          : event.output.stopReason,
                      usage: acpTurnUsage(
                        event.output.usage,
                        context.acpLease?.initialization.agentInfo,
                      ),
                    }),
                  },
                },
                onError: {
                  target: 'publishing',
                  actions: [
                    {
                      type: 'rememberPromptFailure',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                    {
                      type: 'recordPromptAuthentication',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                    {
                      type: 'rememberAcpOutcome',
                      params: ({ context }): EndTurnParameters => ({
                        stopReason:
                          context.turnEnding.kind === 'cancel'
                            ? 'cancelled'
                            : 'error',
                      }),
                    },
                  ],
                },
              },
              exit: 'cancelAcpRequests',
              on: {
                'acp.failed': {
                  target: 'interrupting',
                  actions: [
                    { type: 'recordCrash', params: { duringTurn: true } },
                  ],
                },
                'session.cancel': {
                  target: '.cancelling',
                  actions: [
                    'rememberCancellation',
                    'cancelAcpRequests',
                    'publishCancellation',
                    { type: 'endTurn', params: { stopReason: 'cancelled' } },
                  ],
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
                  actions: [
                    'rememberStorageFailure',
                    'rememberCancellation',
                    'cancelAcpRequests',
                    'publishCancellation',
                    { type: 'endTurn', params: { stopReason: 'error' } },
                  ],
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
                    // The Turn already ended; only the Session's options still change.
                    'acp.update': [
                      { guard: 'isConfigUpdate', actions: 'applyAcpConfig' },
                      {},
                    ],
                    'session.cancel': {},
                    [storageFailingEvent]: {
                      actions: 'rememberStorageFailure',
                    },
                    [acpPermissionEvent]: { actions: 'refuseAcpRequest' },
                    [acpElicitationEvent]: { actions: 'refuseAcpRequest' },
                    [acpRequestWithdrawnEvent]: { actions: 'forgetAcpRequest' },
                  },
                  initial: 'sending',
                  states: {
                    sending: {
                      invoke: {
                        src: 'cancelAcp',
                        id: 'cancelAcp',
                        input: ({ context }) => context,
                        onDone: { target: 'waiting' },
                        onError: {
                          target: 'waiting',
                          actions: {
                            type: 'rememberFailure',
                            params: ({ event }): FailureParameters => ({
                              error: event.error,
                            }),
                          },
                        },
                      },
                    },
                    waiting: {},
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
                    target: 'closing',
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
                    params: ({ event }): FailureParameters => ({
                      error: event.error,
                    }),
                  },
                },
              },
            },
            interrupting: {
              on: {
                'acp.failed': {},
                'session.close': {
                  target: 'closing',
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
                  target: 'closing',
                  actions: {
                    type: 'endTurn',
                    params: connectionLostDuringTurn,
                  },
                },
                onError: {
                  target: 'closing',
                  actions: {
                    type: 'endTurn',
                    params: connectionLostDuringTurn,
                  },
                },
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
                onError: acpReleaseTransitions,
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
      },
    },
    // A Session no prompt reached leaves no row or worktree behind.
    discarding: {
      invoke: {
        id: 'discardSession',
        src: 'discardSession',
        input: ({ context, self }): SessionDiscard => ({
          input: context.input,
          data: context,
          stored: context.stored,
          writer: findMachineActor(
            self.system,
            databaseWriterId,
            writerMachine,
          ),
        }),
        onDone: { target: 'closed' },
        onError: { target: 'closed', actions: 'addDiscardFailure' },
      },
    },
    finishing: {
      always: [
        { guard: 'isArchiving', target: 'archived' },
        { target: 'closed' },
      ],
    },
    archived: {
      after: { checkoutRemovalDelay: { target: 'removingCheckout' } },
      on: {
        'session.unarchive': { target: 'undoingArchive' },
        'session.close': { target: 'closed' },
      },
    },
    undoingArchive: {
      invoke: {
        id: 'undoArchive',
        src: 'undoArchive',
        input: ({ context, self }) => ({
          context,
          writer: findMachineActor(
            self.system,
            databaseWriterId,
            writerMachine,
          ),
        }),
        onDone: { target: 'closed' },
        onError: {
          target: 'closed',
          actions: {
            type: 'rememberFailure',
            params: ({ event }): FailureParameters => ({ error: event.error }),
          },
        },
      },
    },
    removingCheckout: {
      invoke: {
        id: 'removeCheckout',
        src: 'removeCheckout',
        input: ({ context }) => context,
        onDone: { target: 'closed' },
        onError: {
          target: 'closed',
          actions: {
            type: 'rememberFailure',
            params: ({ event }): FailureParameters => ({ error: event.error }),
          },
        },
      },
    },
    closed: { type: 'final' },
  },
});

export type SessionActorRef = ActorRefFrom<typeof sessionMachine>;
