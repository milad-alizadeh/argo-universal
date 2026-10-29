import type { SessionConfigOption } from '@repo/contracts';
import { countRejection } from '@repo/machine-log';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  fromPromise,
  fromCallback,
  sendTo,
  setup,
  spawnChild,
  stateIn,
  stopChild,
  or,
  and,
  type InputFrom,
} from 'xstate';
import { sessionOpenError } from '../agents';
import {
  messageRejectedEvent,
  turnEndingEvent,
  type FeedEvent,
  type FeedInput,
  type FeedTurnEnding,
} from '../feed';
import { feedMachine } from '../feed';
import type { WriterActorRef, WriterEvent } from '../storage';
import {
  cancelAcp,
  closeAcp,
  commitPrompt,
  configureAcp,
  openAcp,
  restoreAcpConfiguration,
  promptAcp,
  publishTurn,
  type AcpOperationInput,
  type OpenedAcpSession,
} from './acp-operations';
import type { AcpLifetimeEvent, AcpSessionLifetime } from './acp/acp-lifetime';
import { promptFailureOutcome } from './acp/prompts/prompt-outcome';
import type {
  AcpPromptRequest as PromptRequest,
  AcpPromptResponse as PromptResponse,
} from './acp/prompts/prompt-types';
import { acpContextUsage, acpTurnUsage } from './acp/prompts/usage';
import {
  admitsPermissionAnswer,
  answeredRequest,
} from './admission/answer-admission';
import { hasConfigurationCapacity } from './admission/config-admission';
import { isReplayedHistory } from './admission/update-admission';
import { AgentOptionsJob } from './agent-options-storage';
import {
  saveSessionArchive,
  removeSessionCheckout,
} from './archive/archive-operations';
import { type ClosureStep, nextClosureStep } from './closure/closure-step';
import {
  acknowledgeConfigChoice,
  applyConfigurationReport,
  holdConfigChoice,
  queueConfigChoice,
  readConfigurationUpdate,
  rejectConfigChoice,
  rejectPendingConfig,
  releaseHeldConfig,
  takeConfigChoice,
} from './config-queue';
import { toConfigValues } from './configuration/config-choices';
import { creationSettledEvent } from './creation-receipt';
import { initialSessionContext } from './initial-context';
import { nativePermissionEvent } from './native-permissions';
import { pendingInputRequest } from './pending-input';
import {
  permissionHookedEvent,
  toolCallHooks,
  toolCallHooksId,
} from './permission-hooks';
import {
  cancelRequests,
  hookedAnswer,
  permissionOutcome,
  rememberHookedPermission,
  withdrawRequest,
} from './request-queues';
import {
  acpUpdateEvent,
  setConfigEvent,
  storageFailingEvent,
  writeFeedEvent,
  type EndTurnParameters,
  type SessionContext,
  type SessionEvent,
  type SessionMachineInput,
  type SessionWrite,
} from './session-context';
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
import { sessionFeedInput } from './session-feed';
import { SessionRowUpdateJob, SessionTitleJob } from './session-storage';
import { withShell } from './shells';
import {
  flushSubagents,
  ownsSubagentUpdate,
  routeSubagentUpdate,
  subagentFeed,
} from './subagents';
import {
  connectionLostDuringTurn,
  endTurn,
  recordCrash,
  startTurn,
  type StartTurnParameters,
} from './turn-lifecycle';

export type {
  SessionCommand,
  SessionContext,
  SessionMachineInput,
} from './session-context';

const rejectedMessageEvent = 'agent.messageRejected';

const closedSessionTarget = '#session.finishing';

const discardingSessionTarget = '#session.discarding';

const acpPermissionEvent = 'acp.permissionRequested';

const acpElicitationEvent = 'acp.elicitationRequested';

const answerPermissionEvent = 'session.answerPermission';

const acpRequestWithdrawnEvent = 'acp.requestWithdrawn';

const answerElicitationEvent = 'session.answerElicitation';

const configuringState = 'configuring';

type SessionDataParameters = { data: SessionData };

type FailureParameters = { error: unknown };

type CrashNoticeParameters = { duringTurn?: boolean } | undefined;

type LoadSessionInput = {
  session: SessionInput;
  writer: WriterActorRef | undefined;
};

export const checkoutLimit = 10_000;

const connectionLostBeforePrompt =
  'The Agent connection failed before the prompt was sent';

const writer = ({ context }: { context: SessionContext }): WriterActorRef =>
  context.input.writer;

type WriteQueue = {
  sendTo: (target: WriterActorRef, event: WriterEvent) => void;
};

const enqueueWrites = (
  enqueue: WriteQueue,
  context: SessionContext,
  writes: readonly SessionWrite[],
): void => {
  for (const write of writes)
    enqueue.sendTo(context.input.writer, { type: writeFeedEvent, ...write });
};

// The Session's one child actor: its Feed, invoked under the id "feed".
type SessionChildren = { feed: 'feed'; [id: `subagent:${string}`]: 'feed' };

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
    toolCallHooks,
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
    cancelAcp: fromPromise<void, SessionContext>(({ input }) =>
      cancelAcp(input),
    ),
    configureAcp: fromPromise<SessionConfigOption[], SessionContext>(
      ({ input }) => configureAcp(input),
    ),
    publishTurn: fromPromise<void, AcpOperationInput>(({ input }) =>
      publishTurn(input),
    ),
    commitPrompt: fromPromise<PromptRequest, AcpOperationInput>(
      ({ input, signal }) => commitPrompt(input, signal),
    ),
    promptAcp: fromPromise<PromptResponse, SessionContext>(({ input }) =>
      promptAcp(input),
    ),
    acpSubscription: fromCallback<
      AcpLifetimeEvent,
      AcpSessionLifetime,
      AcpLifetimeEvent
    >(({ input, sendBack }) => input.bind(sendBack)),
    openAcp: fromPromise<OpenedAcpSession, SessionContext>(({ input }) =>
      openAcp(input),
    ),
    restoreAcpConfiguration: fromPromise<SessionConfigOption[], SessionContext>(
      ({ input, signal }) => restoreAcpConfiguration(input, signal),
    ),
    closeAcp: fromPromise<void, AcpOperationInput>(({ input }) =>
      closeAcp(input),
    ),
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
    routeSubagentUpdate: assign(({ context, event, spawn, self }) => {
      assertEvent(event, acpUpdateEvent);

      return {
        subagents: routeSubagentUpdate(
          {
            parent: context,
            parentFeed: self.getSnapshot().children.feed,
            spawn: (input) => spawn('feed', subagentFeed(input)),
            storageFailing: () => self.send({ type: storageFailingEvent }),
          },
          context.subagents,
          event.notification,
        ),
      };
    }),
    flushSubagents: ({ context }) => flushSubagents(context.subagents),
    finishAcpRegistration: ({ context }): void =>
      context.acpLifetime.finishRegistration(),
    queueAcpConfig: assign(({ context, event }) => {
      assertEvent(event, setConfigEvent);

      return queueConfigChoice(context, event);
    }),
    holdAcpConfig: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, setConfigEvent);
      const { change, writes } = holdConfigChoice(context, event);

      enqueue.assign(change);
      enqueueWrites(enqueue, context, writes);
    }),
    releaseHeldConfig: assign(({ context }) => releaseHeldConfig(context)),
    takeAcpConfig: assign(({ context }) => takeConfigChoice(context)),
    saveAcpCommands: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, acpUpdateEvent);
      const update = event.notification.update;

      if (update.sessionUpdate !== 'available_commands_update') return;

      const commands = update.availableCommands.map(
        ({ name, description, input }) => ({
          name,
          description,
          hint: input?.hint,
        }),
      );

      enqueue.assign({ slashCommands: commands });
      enqueueWrites(enqueue, context, [
        {
          job: new AgentOptionsJob(
            { agent: context.agent, projectId: context.projectId },
            undefined,
            { authoritative: true, commands },
          ),
        },
      ]);
    }),
    applyAcpConfig: enqueueActions(
      ({ context, event, enqueue }, options?: SessionConfigOption[]) => {
        const nextOptions = options ?? readConfigurationUpdate(context, event);

        if (!nextOptions) return;

        const { change, writes } = applyConfigurationReport(
          context,
          nextOptions,
          options !== undefined,
        );

        enqueue.assign(change);
        enqueueWrites(enqueue, context, writes);
      },
    ),
    acknowledgeAcpConfig: assign(({ context }) =>
      acknowledgeConfigChoice(context),
    ),
    rejectAcpConfig: enqueueActions(
      ({ context, enqueue }, params: FailureParameters) => {
        const { change, writes } = rejectConfigChoice(context, params);

        enqueue.assign(change);
        enqueueWrites(enqueue, context, writes);
      },
    ),
    rejectPendingAcpConfig: assign(({ context }) =>
      rejectPendingConfig(context),
    ),
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
    applyAcpTitle: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, acpUpdateEvent);
      const update = event.notification.update;

      if (update.sessionUpdate !== 'session_info_update') return;
      const title = update.title?.trim();

      if (!title) return;
      enqueue.sendTo(writer, {
        type: writeFeedEvent,
        job: new SessionTitleJob({
          id: context.sessionId,
          title,
          titleSource: 'agent',
        }),
      });
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
          pendingSubmission: null,
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
        'acpLease' | 'vendorSessionId' | 'configOptions' | 'usage'
      > => {
        return {
          acpLease: lease,
          vendorSessionId: lease.sessionId,
          configOptions,
          usage: context.usage
            ? acpContextUsage(context.usage, lease.initialization)
            : null,
        };
      },
    ),
    rememberRestoredConfiguration: assign(
      (_, options: SessionConfigOption[]) => ({
        configOptions: options,
        configValues: toConfigValues(options),
      }),
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
    storeAgentOptions: sendTo(writer, ({ context }) => ({
      type: writeFeedEvent,
      job: new AgentOptionsJob(
        { agent: context.agent, projectId: context.projectId },
        context.configOptions,
        { authoritative: true },
      ),
    })),
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
        const { change, write } = startTurn(context, params.turnId);

        enqueue.assign(change);
        enqueueWrites(enqueue, context, [write]);
      },
    ),
    endTurn: enqueueActions(
      ({ context, enqueue }, ended: EndTurnParameters): void => {
        const { change, write, complete } = endTurn(context, ended);

        if (write) enqueueWrites(enqueue, context, [write]);

        if (complete) enqueue.sendTo('feed', complete);
        enqueue.assign(change);
      },
    ),
    queuePermission: assign(
      ({ context, event }): Pick<SessionContext, 'permissionQueue'> => {
        assertEvent(event, [acpPermissionEvent, nativePermissionEvent]);

        return {
          permissionQueue: [...context.permissionQueue, event.request],
        };
      },
    ),
    hookPermission: spawnChild('toolCallHooks', {
      id: ({ event }): string => {
        assertEvent(event, acpPermissionEvent);

        return toolCallHooksId(event.request.requestId);
      },
      input: ({ context, event, self }): InputFrom<typeof toolCallHooks> => {
        assertEvent(event, acpPermissionEvent);

        return {
          hooks: context.input.hooks,
          sessionId: context.sessionId,
          projectId: context.projectId,
          request: event.request,
          session: self,
        };
      },
    }),
    rememberHookedPermission: assign(
      ({ context, event }): Pick<SessionContext, 'hookedPermissions'> => {
        assertEvent(event, permissionHookedEvent);

        return {
          hookedPermissions: rememberHookedPermission(context, event),
        };
      },
    ),
    forgetPermissionHooks: stopChild(({ event }): string => {
      assertEvent(event, permissionHookedEvent);

      return toolCallHooksId(event.requestId);
    }),
    // A hooked answer settles the first request as a person's answer does, through the Feed.
    answerHookedPermission: enqueueActions(({ context, enqueue }): void => {
      const answer = hookedAnswer(context);

      if (answer) enqueue.raise({ type: answerPermissionEvent, ...answer });
    }),
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
      const { cancelled, queues } = withdrawRequest(context, event.requestId);

      enqueue.sendTo('feed', cancelled);
      enqueue.assign(queues);
    }),
    publishPermissionOutcome: sendTo('feed', ({ context, event }) => {
      assertEvent(event, answerPermissionEvent);

      return permissionOutcome(context, event.optionId);
    }),
    answerAcpPermission: ({ context, event }): void => {
      assertEvent(event, answerPermissionEvent);
      context.acpLifetime.answerPermission(event.requestId, event.optionId);
    },
    // An Operation's call publishes its own outcome on its Tool call.
    answerOperationPermission: ({ context, event }): void => {
      assertEvent(event, answerPermissionEvent);
      context.nativePermissions.answer(event.requestId, event.optionId);
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
    cancelSessionRequests: enqueueActions(({ context, enqueue }): void => {
      context.nativePermissions.cancelAll();
      context.acpLifetime.cancelRequests();
      enqueue.assign(cancelRequests(context));
    }),
    recordCrash: enqueueActions(
      ({ context, event, enqueue }, params: CrashNoticeParameters): void => {
        assertEvent(event, 'acp.failed');
        const crash = recordCrash(context, event, params?.duringTurn ?? false);

        for (const child of crash.subagents) {
          enqueue.sendTo(child.feed, child.event);
          enqueueWrites(enqueue, context, [{ job: child.job }]);
        }

        if (crash.turnEnding) enqueue.assign({ turnEnding: crash.turnEnding });

        if (crash.announce) enqueue.sendTo('feed', crash.announce);
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
    isSubagentUpdate: ({ context, event }): boolean => {
      assertEvent(event, acpUpdateEvent);

      return ownsSubagentUpdate(context.subagents, event.notification);
    },
    isCommandsUpdate: ({ event }): boolean =>
      event.type === acpUpdateEvent &&
      event.notification.update.sessionUpdate === 'available_commands_update',
    isConfigUpdate: ({ event }): boolean =>
      event.type === acpUpdateEvent &&
      event.notification.update.sessionUpdate === 'config_option_update',
    isTitleUpdate: ({ event }): boolean =>
      event.type === acpUpdateEvent &&
      event.notification.update.sessionUpdate === 'session_info_update',
    isReplayedHistory: ({ context, event }): boolean =>
      event.type === acpUpdateEvent &&
      isReplayedHistory(
        context.vendorSessionId,
        event.notification.update.sessionUpdate,
      ),
    hasAcpConfig: ({ context }) => context.configQueue.length > 0,
    hasSubmission: ({ context }) => context.pendingSubmission !== null,
    hasHeldSubmission: ({ context }): boolean =>
      context.pendingSubmission !== null && context.heldConfig.length > 0,
    holdsAcpConfig: or([
      stateIn({ open: { acp: 'activeTurn' } }),
      stateIn({ open: { acp: 'publishing' } }),
      ({ context }): boolean => context.heldConfig.length > 0,
    ]),
    hasConfigurationCapacity: ({ context }): boolean =>
      hasConfigurationCapacity(
        context.configQueue.length + context.heldConfig.length,
      ),
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
    // Argo asks about an Operation the Agent called; the Agent asks about its own Tool call.
    asksForOperation: ({ context }): boolean =>
      context.permissionQueue[0]?.operation !== undefined,
    isPermissionHead: ({ context, event }): boolean =>
      event.type === answerPermissionEvent &&
      admitsPermissionAnswer(context.permissionQueue, event),
    hasPermission: ({ context }): boolean =>
      pendingInputRequest(context)?.kind === 'permission',
    hasElicitation: ({ context }): boolean =>
      pendingInputRequest(context)?.kind === 'elicitation',
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

const acpOpeningFailure = {
  ...sessionEntryOutcome.onError,
  target: 'closing',
} as const;

const acpTurnOutcome = ({
  context,
}: {
  context: SessionContext;
}): EndTurnParameters => context.acpTurnOutcome ?? { stopReason: 'error' };

const toPromptTurn = ({
  context,
}: {
  context: SessionContext;
}): StartTurnParameters => {
  if (!context.pendingSubmission) throw new Error('No Session submission');

  return context.pendingSubmission;
};

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

const archiveOperationOutcome = {
  onDone: { target: 'closed' },
  onError: {
    target: 'closed',
    actions: {
      type: 'rememberFailure',
      params: ({
        event,
      }: {
        event: { error: unknown };
      }): FailureParameters => ({ error: event.error }),
    },
  },
} as const;

export const sessionMachine = sessionSetup.createMachine({
  id: 'session',
  context: ({ input, self }): SessionContext =>
    initialSessionContext(input, (event) => self.send(event)),
  on: {
    [creationSettledEvent]: {
      guard: ({ context }) => context.input.kind === 'new',
      actions: assign(({ event }) => ({ creationReceipt: event.receipt })),
    },
    // Outside a Turn a hooked answer has nothing to settle; its Hooks still end.
    [permissionHookedEvent]: { actions: 'forgetPermissionHooks' },
    'agent.shellChanged': {
      actions: assign(({ context, event }) => ({
        shells: withShell(context.shells, event.shell),
      })),
    },
  },
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
        input: ({ context }): LoadSessionInput => ({
          session: context.input,
          writer: context.input.writer,
        }),
        ...sessionEntryOutcome,
      },
    },
    open: {
      invoke: {
        id: 'feed',
        src: 'feed',
        input: ({ context, self }): FeedInput =>
          sessionFeedInput(context, () =>
            self.send({ type: storageFailingEvent }),
          ),
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
              { guard: 'isSubagentUpdate', actions: 'routeSubagentUpdate' },
              { guard: 'isConfigUpdate', actions: 'applyAcpConfig' },
              { guard: 'isCommandsUpdate', actions: 'saveAcpCommands' },
              {
                guard: ({ event }): boolean =>
                  event.notification.update.sessionUpdate === 'usage_update',
                actions: 'rememberAcpUsage',
              },
              { guard: 'isTitleUpdate', actions: 'applyAcpTitle' },
              { actions: 'forwardAcpUpdate' },
            ],
            [setConfigEvent]: [
              {
                guard: and(['acceptsAcpConfig', 'holdsAcpConfig']),
                actions: 'holdAcpConfig',
              },
              { guard: 'acceptsAcpConfig', actions: 'queueAcpConfig' },
            ],
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
                input: ({ context }) => ({
                  context,
                  writer: context.input.writer,
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
                  target: 'restoring',
                  actions: [
                    {
                      type: 'rememberAcpLease',
                      params: ({ event }): OpenedAcpSession => event.output,
                    },
                    'finishAcpRegistration',
                  ],
                },
                onError: acpOpeningFailure,
              },
              on: {
                'session.close': { target: 'closing' },
                'acp.update': { guard: 'isReplayedHistory' },
              },
            },
            restoring: {
              invoke: {
                id: 'restoreAcpConfiguration',
                src: 'restoreAcpConfiguration',
                input: ({ context }): SessionContext => ({
                  ...context,
                  configValues:
                    context.input.kind === 'existing'
                      ? context.configValues
                      : [],
                }),
                onDone: {
                  target: 'idle',
                  actions: [
                    {
                      type: 'rememberRestoredConfiguration',
                      params: ({ event }): SessionConfigOption[] =>
                        event.output,
                    },
                    'storeSession',
                    'storeAcpSession',
                    'storeAgentOptions',
                    'discloseInterruption',
                  ],
                },
                onError: acpOpeningFailure,
              },
              on: {
                'session.close': { target: 'closing' },
                'acp.update': { guard: 'isConfigUpdate' },
              },
            },
            idle: {
              always: [
                { guard: 'hasAcpConfig', target: configuringState },
                { guard: 'hasHeldSubmission', actions: 'releaseHeldConfig' },
                { guard: 'hasSubmission', target: 'committing' },
              ],
              on: {
                'acp.failed': { target: 'closing', actions: 'recordCrash' },
                'session.close': { target: 'closing' },
                'session.prompt': {
                  actions: ['rememberSubmission', 'releaseHeldConfig'],
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
                  actions: [
                    {
                      type: 'rejectAcpConfig',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                    {
                      type: 'rejectSubmission',
                      params: ({ event }): FailureParameters => ({
                        error: event.error,
                      }),
                    },
                  ],
                },
              },
            },
            committing: {
              entry: { type: 'persistTurn', params: toPromptTurn },
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
                      params: ({ context, event }): EndTurnParameters =>
                        promptFailureOutcome(
                          context.turnEnding.kind === 'cancel',
                          event.error,
                        ),
                    },
                  ],
                },
              },
              exit: 'cancelSessionRequests',
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
                    'cancelSessionRequests',
                    'publishCancellation',
                    { type: 'endTurn', params: { stopReason: 'cancelled' } },
                  ],
                },
                [nativePermissionEvent]: {
                  guard: ({ context, event }) =>
                    event.turnId === context.activeTurnId,
                  target: '.awaitingPermission',
                  actions: 'queuePermission',
                },
                [acpPermissionEvent]: {
                  target: '.awaitingPermission',
                  actions: ['queuePermission', 'hookPermission'],
                },
                [permissionHookedEvent]: {
                  actions: [
                    'forgetPermissionHooks',
                    'rememberHookedPermission',
                    'answerHookedPermission',
                  ],
                },
                [acpElicitationEvent]: {
                  target: '.awaitingElicitation',
                  actions: 'queueElicitation',
                },
                [acpRequestWithdrawnEvent]: {
                  target: '.working',
                  actions: 'forgetAcpRequest',
                },
                [answerPermissionEvent]: [
                  {
                    guard: and(['isPermissionHead', 'asksForOperation']),
                    target: '.working',
                    actions: ['answerOperationPermission', 'removePermission'],
                  },
                  {
                    guard: 'isPermissionHead',
                    target: '.working',
                    actions: [
                      'publishPermissionOutcome',
                      'answerAcpPermission',
                      'removePermission',
                    ],
                  },
                ],
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
                    'cancelSessionRequests',
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
                awaitingPermission: { entry: 'answerHookedPermission' },
                awaitingElicitation: {},
                cancelling: {
                  on: {
                    // The parent Turn ended; Subagents still own their active Turns.
                    'acp.update': [
                      {
                        guard: 'isSubagentUpdate',
                        actions: 'routeSubagentUpdate',
                      },
                      { guard: 'isConfigUpdate', actions: 'applyAcpConfig' },
                      { guard: 'isCommandsUpdate', actions: 'saveAcpCommands' },
                      { guard: 'isTitleUpdate', actions: 'applyAcpTitle' },
                      {},
                    ],
                    'session.cancel': {},
                    [storageFailingEvent]: {
                      actions: 'rememberStorageFailure',
                    },
                    [nativePermissionEvent]: {},
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
              on: {
                'session.close': {},
                'acp.update': { guard: 'isConfigUpdate' },
              },
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
              entry: ['flushSubagents', 'flushFeed'],
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
        input: ({ context }): SessionDiscard => ({
          input: context.input,
          data: context,
          stored: context.stored,
          writer: context.input.writer,
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
        'session.close': {},
        'session.shutdown': { target: 'closed' },
      },
    },
    undoingArchive: {
      invoke: {
        id: 'undoArchive',
        src: 'undoArchive',
        input: ({ context }) => ({
          context,
          writer: context.input.writer,
        }),
        ...archiveOperationOutcome,
      },
    },
    removingCheckout: {
      invoke: {
        id: 'removeCheckout',
        src: 'removeCheckout',
        input: ({ context }) => context,
        ...archiveOperationOutcome,
      },
    },
    closed: { type: 'final' },
  },
});

export type SessionActorRef = ActorRefFrom<typeof sessionMachine>;
