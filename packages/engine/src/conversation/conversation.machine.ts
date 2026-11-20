import type { ConversationEnd } from '@repo/contracts';
import {
  assertEvent,
  assign,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import { agentRelay, asksTheRelay, type RelayInput } from './agent-relay-actor';
import { defaultConduct } from './conversation-conduct';
import {
  closeEndingOf,
  endLogLine,
  endNoticeOf,
  type EndingFacts,
  type EndParameters,
} from './conversation-endings';
import {
  callProvider,
  runningCall,
  type RunningCall,
  type StartRefusal,
  type ConversationContext,
  type ConversationEvent,
  type ConversationInput,
} from './conversation-types';
import { watchConnection, watchSession } from './conversation-watchers';
import type {
  ConversationConnectionStatus,
  ConversationProviderEvent,
} from './provider';
import { providerCall, type ProviderCallInput } from './provider-call';
import { detachedSessions } from './session-link';
import {
  isTranscript,
  readOutAfter,
  readOutFrom,
  storeTranscript,
  withTranscript,
  type HearingCall,
  type TranscriptEvent,
} from './transcript';

/*
 * The Conversation's lifecycle (ADR-0064): one machine for the one call a Server runs, attached to one Session for its whole life.
 * It is not part of the Session machine or the Agent machine; it watches its Session and the App's Connection from outside.
 * Provider events other than the connection's own pass through `provider.event` for the transcript, request and usage work that builds on this.
 */

export const conversationSystemId = 'conversation';

const reportsStatus =
  (status: ConversationConnectionStatus) =>
  (event: ConversationProviderEvent): boolean =>
    event.type === 'status' && event.status === status;

const isConnectedStatus = reportsStatus('connected');

const isDisconnectedStatus = reportsStatus('disconnected');

const isErrorStatus = (event: ConversationProviderEvent): boolean =>
  event.type === 'status' && event.status === 'error';

const isErrorClose = (event: ConversationProviderEvent): boolean =>
  event.type === 'closed' && event.reason === 'error';

// The most notes a call keeps for its log line; older ones fall away.
const trailLength = 10;

function providerEventOf(event: ConversationEvent): ConversationProviderEvent {
  assertEvent(event, 'provider.event');

  return event.event;
}

type CallStartEvent = Extract<ConversationEvent, { type: 'call.start' }>;

function startOf(event: ConversationEvent): CallStartEvent {
  assertEvent(event, 'call.start');

  return event;
}

const callIdleMs = (call: RunningCall | null): number =>
  (call?.conduct ?? defaultConduct).idleMs;

// The idle timeout the call started with, unless the Engine was started with one for every call.
const idleOf = (context: ConversationContext): number =>
  context.idleMs ?? callIdleMs(context.call);

// What an ending's notice and log line say of the call: why it failed, and the idle timeout it ran with.
const endingFactsOf = (context: ConversationContext): EndingFacts => ({
  failure: context.failure,
  idleMs: idleOf(context),
});

// A call that has only been asked for: not answered, not connected, nobody speaking.
const newCall = (start: CallStartEvent): RunningCall => ({
  conversationId: start.conversationId,
  sessionId: start.sessionId,
  offer: start.offer,
  setup: start.setup,
  conduct: start.conduct ?? defaultConduct,
  connection: start.connection,
  answer: null,
  startedAt: null,
  speaking: false,
  agentWorking: false,
  microphoneBlocked: false,
  trail: [],
});

const providerFailure = 'The connection to the voice failed.';

// Each provider event, by its type.
type ProviderEvents = {
  [Event in ConversationProviderEvent as Event['type']]: Event;
};

type Reports = {
  [Type in keyof ProviderEvents]?: (
    event: ProviderEvents[Type],
    call: RunningCall,
  ) => Partial<RunningCall>;
};

// What each provider report changes about the running call; reports not listed change nothing.
const reports: Reports = {
  speaking: (event) => ({ speaking: event.speaking }),
  trouble: (event) => ({ microphoneBlocked: event.trouble !== null }),
  // A usage report that says how much allowance is left warns as a limit report does.
  usage: ({ inputTokens, outputTokens, limit }) => ({
    usage: { inputTokens, outputTokens },
    ...(limit && { limit }),
  }),
  limit: ({ remaining, resetsAt }) => ({
    limit: resetsAt === undefined ? { remaining } : { remaining, resetsAt },
  }),
  trail: ({ note }, { trail }) => ({
    trail: [...trail, note].slice(-trailLength),
  }),
};

// Folds what the provider reported about the call into the running call.
function reported(
  call: RunningCall,
  event: ConversationProviderEvent,
): RunningCall {
  return { ...call, ...reportOf(event.type, event, call) };
}

// The report kept for `type` reads the event of that type.
function reportOf<Type extends keyof ProviderEvents>(
  type: Type,
  event: ProviderEvents[Type],
  call: RunningCall,
): Partial<RunningCall> | undefined {
  return reports[type]?.(event, call);
}

const namesCall = (
  sessionId: string | undefined,
  call: RunningCall | null,
): boolean => sessionId === undefined || sessionId === call?.sessionId;

const endedOf = (
  call: RunningCall | null,
  reason: EndParameters['reason'],
): ConversationContext['ended'] =>
  call && {
    conversationId: call.conversationId,
    sessionId: call.sessionId,
    reason,
  };

const finished = (
  { call }: ConversationContext,
  { reason }: EndParameters,
): Partial<ConversationContext> => ({
  call: null,
  ended: endedOf(call, reason),
  partials: [],
  readOut: null,
});

// The running call as its transcript is kept: where, and whether the voice is reading out a result.
const hearing = (context: ConversationContext): HearingCall => ({
  ...runningCall(context),
  readOut: context.readOut,
});

function transcriptOf(event: ConversationEvent): TranscriptEvent | undefined {
  const heard = providerEventOf(event);

  return isTranscript(heard) ? heard : undefined;
}

const conversationSetup = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as ConversationInput,
    context: {} as ConversationContext,
    events: {} as ConversationEvent,
  },
  delays: { idle: ({ context }): number => idleOf(context) },
  actors: { providerCall, agentRelay, watchSession, watchConnection },
  actions: {
    begin: assign(({ event }): Partial<ConversationContext> => ({
      call: newCall(startOf(event)),
      ended: null,
      failure: null,
      refused: null,
      turnRunning: false,
      readOut: null,
    })),
    // Records why the start was refused, under its conversationId, for the one who asked.
    refuseStart: assign(
      ({ event }, refusal: StartRefusal): Partial<ConversationContext> => ({
        refused: { conversationId: startOf(event).conversationId, refusal },
      }),
    ),
    answer: assign(({ context, event }): Partial<ConversationContext> => {
      assertEvent(event, 'call.answered');

      return { call: { ...runningCall(context), answer: event.answer } };
    }),
    attachSessions: assign(({ event }): Partial<ConversationContext> => {
      assertEvent(event, 'sessions.attach');

      return { sessions: event.sessions };
    }),
    noteTurns: assign(({ event }): Partial<ConversationContext> => {
      assertEvent(event, 'call.turns');

      return { turnRunning: event.running };
    }),
    // Tells the person, in the Session's Feed, why the call ended; runs before `finish`, while the call is known, and a call ends once.
    announceEnd: ({ context }, params: EndParameters): void => {
      const notice = endNoticeOf(params, endingFactsOf(context));

      if (context.call && notice)
        context.sessions.notice(context.call.sessionId, notice);
    },
    // Every end goes to the Server's log, so a call that stopped can be traced.
    logEnd: ({ context }, params: EndParameters): void => {
      const { call } = context;

      if (call)
        context.log(
          endLogLine({
            call,
            params,
            facts: endingFactsOf(context),
            now: context.now(),
          }),
        );
    },
    finish: assign(({ context }, params: EndParameters) =>
      finished(context, params),
    ),
    storeTranscript: ({ context, event, system }): void => {
      const heard = transcriptOf(event);

      if (heard) storeTranscript(system, hearing(context), heard);
    },
    trackPartials: assign(
      ({ context, event }): Partial<ConversationContext> => {
        const heard = transcriptOf(event);

        return heard
          ? {
              partials: withTranscript(
                context.partials,
                hearing(context),
                heard,
              ),
              readOut: readOutAfter(context.readOut, heard),
            }
          : {};
      },
    ),
    // The relay handed the voice an Agent's result: what the voice says next is a read-out.
    noteReadOut: assign(({ context, event }): Partial<ConversationContext> => {
      assertEvent(event, 'voice.say');

      return event.say.kind === 'result'
        ? { readOut: readOutFrom(context.readOut, context.partials) }
        : {};
    }),
    recordFailure: assign(({ event }): Partial<ConversationContext> => {
      assertEvent(event, 'call.failed');

      return { failure: event.message };
    }),
    recordProviderFailure: assign({ failure: providerFailure }),
    foldProvider: assign(
      ({ context, event }): Partial<ConversationContext> => ({
        call: reported(runningCall(context), providerEventOf(event)),
      }),
    ),
    // The timer starts the first time the call connects and keeps that time through any reconnecting.
    markStarted: assign(({ context }): Partial<ConversationContext> => {
      const call = runningCall(context);

      return {
        call: {
          ...call,
          startedAt: call.startedAt ?? new Date().toISOString(),
        },
      };
    }),
    foldTurn: assign(({ context, event }): Partial<ConversationContext> => {
      assertEvent(event, 'session.turn');

      return { call: { ...runningCall(context), agentWorking: event.running } };
    }),
  },
  guards: {
    hasProvider: ({ context }): boolean => context.provider !== null,
    sessionOpen: ({ context, event }): boolean =>
      context.sessionOpen(startOf(event).sessionId),
    endsThisCall: ({ context, event }): boolean => {
      assertEvent(event, 'call.end');

      return namesCall(event.sessionId, context.call);
    },
    hearsTranscript: ({ event }): boolean =>
      isTranscript(providerEventOf(event)),
    isConnected: ({ event }): boolean =>
      isConnectedStatus(providerEventOf(event)),
    isDisconnected: ({ event }): boolean =>
      isDisconnectedStatus(providerEventOf(event)),
    providerErrored: ({ event }): boolean => {
      const reported = providerEventOf(event);

      return isErrorStatus(reported) || isErrorClose(reported);
    },
    noTurnRunning: ({ context }): boolean => !context.turnRunning,
    providerClosed: ({ event }): boolean =>
      providerEventOf(event).type === 'closed',
    turnChanged: ({ context, event }): boolean => {
      assertEvent(event, 'session.turn');

      return runningCall(context).agentWorking !== event.running;
    },
    asksRelay: ({ event }): boolean => asksTheRelay(providerEventOf(event)),
  },
});

type SessionWatchInput = { sessionId: string };

type ConnectionWatchInput = { signal: AbortSignal | undefined };

const idleTarget = '#conversation.idle';

type EndingParams =
  | EndParameters
  | ((args: { event: ConversationEvent }) => EndParameters);

type EndingAction = {
  type: 'announceEnd' | 'logEnd' | 'finish';
  params: EndingParams;
};

// Every end says why where it should, is logged, and leaves the call: in that order, while the call is still known.
const endingWith = (params: EndingParams): EndingAction[] => [
  { type: 'announceEnd', params },
  { type: 'logEnd', params },
  { type: 'finish', params },
];

const endsWith = (reason: ConversationEnd): EndingAction[] =>
  endingWith({ reason });

// A close the provider reported, with its own reason and words.
const providerClose = ({
  event,
}: {
  event: ConversationEvent;
}): EndParameters => closeEndingOf(providerEventOf(event));

// The words the voice said up to a hang-up are kept as any others, unless they are a read-out.
const lastWordsOf =
  (self: AnyActorRef, call: RunningCall) =>
  (event: ConversationProviderEvent): void => {
    // SAFETY: `self` is this machine's own actor, whose snapshot's context is a ConversationContext.
    const { readOut } = (self.getSnapshot() as { context: ConversationContext })
      .context;

    if (isTranscript(event))
      storeTranscript(self.system, { ...call, readOut }, event);
  };

const providerInput = (
  context: ConversationContext,
  self: AnyActorRef,
): ProviderCallInput => {
  const call = runningCall(context);

  return {
    provider: callProvider(context),
    offer: call.offer,
    setup: call.setup,
    briefing: context.briefing(call.sessionId),
    lastWords: lastWordsOf(self, call),
  };
};

const refuseStart = (refusal: StartRefusal) =>
  ({ type: 'refuseStart', params: refusal }) as const;

// A Turn the call started began or ended: the idle period starts over.
const turnsChanged = {
  target: 'connected',
  reenter: true,
  actions: 'noteTurns',
} as const;

export const conversationMachine = conversationSetup.createMachine({
  id: 'conversation',
  context: ({ input }): ConversationContext => ({
    ...input,
    sessions: detachedSessions,
    call: null,
    ended: null,
    failure: null,
    refused: null,
    turnRunning: false,
    partials: [],
    readOut: null,
  }),
  initial: 'idle',
  on: { 'sessions.attach': { actions: 'attachSessions' } },
  states: {
    // The machine alone decides whether a start may begin a call; a refused start records why.
    idle: {
      on: {
        'call.start': [
          { guard: not('hasProvider'), actions: refuseStart('no-provider') },
          {
            guard: not('sessionOpen'),
            actions: refuseStart('session-not-open'),
          },
          { target: 'running', actions: 'begin' },
        ],
      },
    },
    running: {
      invoke: [
        {
          id: 'providerCall',
          src: 'providerCall',
          input: ({ context, self }): ProviderCallInput =>
            providerInput(context, self),
        },
        {
          id: 'agentRelay',
          src: 'agentRelay',
          input: ({ context }): RelayInput => ({
            sessions: context.sessions,
            sessionId: runningCall(context).sessionId,
          }),
        },
        {
          src: 'watchSession',
          input: ({ context }): SessionWatchInput => ({
            sessionId: runningCall(context).sessionId,
          }),
        },
        {
          src: 'watchConnection',
          input: ({ context }): ConnectionWatchInput => ({
            signal: runningCall(context).connection,
          }),
        },
      ],
      initial: 'starting',
      on: {
        // One call runs at a time.
        'call.start': { actions: refuseStart('call-running') },
        'call.end': {
          guard: 'endsThisCall',
          target: idleTarget,
          actions: endingWith(({ event }): EndParameters => {
            assertEvent(event, 'call.end');

            return { reason: event.reason };
          }),
        },
        'call.sessionGone': {
          target: idleTarget,
          actions: endingWith(({ event }): EndParameters => {
            assertEvent(event, 'call.sessionGone');

            return { reason: event.reason };
          }),
        },
        'call.appDisconnected': {
          target: idleTarget,
          actions: endsWith('app-disconnected'),
        },
        'call.failed': {
          target: idleTarget,
          actions: ['recordFailure', ...endsWith('failed')],
        },
        'call.turns': { actions: 'noteTurns' },
        'provider.event': [
          {
            guard: 'hearsTranscript',
            actions: [
              'storeTranscript',
              'trackPartials',
              sendTo('agentRelay', ({ event }) => event),
            ],
          },
          {
            guard: 'providerErrored',
            target: idleTarget,
            actions: ['recordProviderFailure', ...endsWith('failed')],
          },
          {
            guard: 'providerClosed',
            target: idleTarget,
            actions: endingWith(providerClose),
          },
          {
            guard: 'asksRelay',
            actions: sendTo('agentRelay', ({ event }) => event),
          },
          { actions: 'foldProvider' },
        ],
        'session.turn': { guard: 'turnChanged', actions: 'foldTurn' },
        'voice.say': {
          actions: [
            sendTo('providerCall', ({ event }) => event),
            'noteReadOut',
          ],
        },
      },
      states: {
        starting: {
          on: {
            'call.answered': {
              target: 'connecting',
              actions: ['answer', sendTo('agentRelay', ({ event }) => event)],
            },
          },
        },
        connecting: {
          on: {
            'provider.event': { guard: 'isConnected', target: 'connected' },
          },
        },
        // Speech keeps the call alive; a call that hears none for the idle period ends, unless a Turn it started is running.
        connected: {
          entry: 'markStarted',
          on: {
            'provider.event': [
              {
                guard: 'hearsTranscript',
                actions: [
                  'storeTranscript',
                  'trackPartials',
                  sendTo('agentRelay', ({ event }) => event),
                ],
                target: 'connected',
                reenter: true,
              },
              { guard: 'isDisconnected', target: 'reconnecting' },
            ],
            'call.turns': turnsChanged,
          },
          after: {
            idle: {
              guard: 'noTurnRunning',
              target: idleTarget,
              actions: endsWith('idle'),
            },
          },
        },
        // The provider lost its link and is joining again; the idle period waits, and starts over once the call is back.
        reconnecting: {
          on: {
            'provider.event': { guard: 'isConnected', target: 'connected' },
          },
        },
      },
    },
  },
});

export type ConversationActorRef = ActorRefFrom<typeof conversationMachine>;
