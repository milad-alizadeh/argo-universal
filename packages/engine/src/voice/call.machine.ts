import type { VoiceCallEnd } from '@repo/contracts';
import { assertEvent, assign, sendTo, setup, type ActorRefFrom } from 'xstate';
import { agentRelay, type RelayInput } from './agent-relay-actor';
import { defaultConduct } from './call-conduct';
import {
  runningCall,
  type RunningCall,
  type VoiceCallContext,
  type VoiceCallEvent,
  type VoiceCallInput,
} from './call-types';
import { watchConnection, watchSession } from './call-watchers';
import type {
  VoiceConnectionStatus,
  VoiceProvider,
  VoiceProviderEvent,
} from './provider';
import { providerCall, type ProviderCallInput } from './provider-call';
import { detachedSessions, type VoiceNotice } from './session-link';
import { isTranscript, storeTranscript, withTranscript } from './transcript';

/*
 * The Voice call's lifecycle (ADR-0063): one machine for the one call a Server runs, attached to one Session for its whole life.
 * It is not part of the Session machine or the Agent machine; it watches its Session and the App's Connection from outside.
 * Provider events other than the connection's own pass through `provider.event` for the transcript, request and usage work that builds on this.
 */

export const voiceCallSystemId = 'voice';

type EndParameters = { reason: VoiceCallEnd };

const reportsStatus =
  (status: VoiceConnectionStatus) =>
  (event: VoiceProviderEvent): boolean =>
    event.type === 'status' && event.status === status;

const isConnectedStatus = reportsStatus('connected');

const isDisconnectedStatus = reportsStatus('disconnected');

const isErrorStatus = (event: VoiceProviderEvent): boolean =>
  event.type === 'status' && event.status === 'error';

const isErrorClose = (event: VoiceProviderEvent): boolean =>
  event.type === 'closed' && event.reason === 'error';

function providerEventOf(event: VoiceCallEvent): VoiceProviderEvent {
  assertEvent(event, 'provider.event');

  return event.event;
}

type CallStartEvent = Extract<VoiceCallEvent, { type: 'call.start' }>;

const callIdleMs = (call: RunningCall | null): number =>
  (call?.conduct ?? defaultConduct).idleMs;

// The idle timeout the call started with, unless the Engine was started with one for every call.
const idleOf = (context: VoiceCallContext): number =>
  context.idleMs ?? callIdleMs(context.call);

// A call that has only been asked for: not answered, not connected, nobody speaking.
const newCall = (start: CallStartEvent): RunningCall => ({
  callId: start.callId,
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
});

const failedNotice = (description: string): VoiceNotice => ({
  title: 'Voice call failed',
  description,
});

const providerFailure = 'The connection to the voice failed.';

type Report<Type extends VoiceProviderEvent['type']> = (
  event: Extract<VoiceProviderEvent, { type: Type }>,
  call: RunningCall,
) => Partial<RunningCall>;

type Reports = { [Type in VoiceProviderEvent['type']]?: Report<Type> };

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
};

// Folds what the provider reported about the call into the running call.
function reported(call: RunningCall, event: VoiceProviderEvent): RunningCall {
  // SAFETY: `reports` keys each report by the event type it reads, so the report found for `event.type` takes `event`.
  const report = reports[event.type] as Report<typeof event.type> | undefined;

  return { ...call, ...report?.(event, call) };
}

const isLimitClose = (event: VoiceProviderEvent): boolean =>
  event.type === 'closed' && event.reason === 'limit';

const limitNotice = {
  title: 'Voice call ended: usage limit reached',
  description:
    'The Voice provider closed the call because the allowance ran out. Start a new call once it resets.',
};

const namesCall = (
  sessionId: string | undefined,
  call: RunningCall | null,
): boolean => sessionId === undefined || sessionId === call?.sessionId;

const finished = (
  context: VoiceCallContext,
  { reason }: EndParameters,
): Partial<VoiceCallContext> => {
  const { call } = context;

  return {
    call: null,
    ended: call && { callId: call.callId, sessionId: call.sessionId, reason },
    partials: [],
  };
};

const voiceCallSetup = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as VoiceCallInput,
    context: {} as VoiceCallContext,
    events: {} as VoiceCallEvent,
  },
  delays: { idle: ({ context }): number => idleOf(context) },
  actors: { providerCall, agentRelay, watchSession, watchConnection },
  actions: {
    begin: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.start');

      return {
        call: newCall(event),
        ended: null,
        failure: null,
        turnRunning: false,
      };
    }),
    answer: assign(({ context, event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.answered');

      return { call: { ...runningCall(context), answer: event.answer } };
    }),
    attachSessions: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'sessions.attach');

      return { sessions: event.sessions };
    }),
    noteTurns: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.turns');

      return { turnRunning: event.running };
    }),
    // Tells the person, in the Session's Feed, why the call ended.
    noticeLimit: ({ context }): void =>
      context.sessions.notice(runningCall(context).sessionId, limitNotice),
    finish: assign(({ context }, params: EndParameters) =>
      finished(context, params),
    ),
    storeTranscript: ({ context, event, system }): void => {
      const heard = providerEventOf(event);

      if (isTranscript(heard))
        storeTranscript(system, runningCall(context), heard);
    },
    trackPartials: assign(({ context, event }): Partial<VoiceCallContext> => {
      const heard = providerEventOf(event);

      return isTranscript(heard)
        ? { partials: withTranscript(context.partials, heard) }
        : {};
    }),
    recordFailure: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.failed');

      return { failure: event.message };
    }),
    recordProviderFailure: assign({ failure: providerFailure }),
    // Runs before `finish`, while the call and its Session are still known; a call ends once, so it says so once.
    announceFailure: ({ context }): void => {
      const { call, failure } = context;

      if (call && failure !== null)
        context.sessions.notice(call.sessionId, failedNotice(failure));
    },
    foldProvider: assign(({ context, event }): Partial<VoiceCallContext> => ({
      call: reported(runningCall(context), providerEventOf(event)),
    })),
    // The timer starts the first time the call connects and keeps that time through any reconnecting.
    markStarted: assign(({ context }): Partial<VoiceCallContext> => {
      const call = runningCall(context);

      return {
        call: {
          ...call,
          startedAt: call.startedAt ?? new Date().toISOString(),
        },
      };
    }),
    foldTurn: assign(({ context, event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'session.turn');

      return { call: { ...runningCall(context), agentWorking: event.running } };
    }),
  },
  guards: {
    hasProvider: ({ context }): boolean => context.provider !== null,
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
    limitClosed: ({ event }): boolean => isLimitClose(providerEventOf(event)),
    providerClosed: ({ event }): boolean =>
      providerEventOf(event).type === 'closed',
    turnChanged: ({ context, event }): boolean => {
      assertEvent(event, 'session.turn');

      return runningCall(context).agentWorking !== event.running;
    },
    asksForWork: ({ event }): boolean =>
      providerEventOf(event).type === 'work.requested',
  },
});

type SessionWatchInput = { sessionId: string };

type ConnectionWatchInput = { signal: AbortSignal | undefined };

const idleTarget = '#voiceCall.idle';

type FinishAction = { type: 'finish'; params: EndParameters };

const endsWith = (reason: VoiceCallEnd): FinishAction => ({
  type: 'finish',
  params: { reason },
});

const providerInput = (context: VoiceCallContext): ProviderCallInput => {
  const call = runningCall(context);

  return {
    // SAFETY: `call.start` is refused without a provider, so `running` always has one.
    provider: context.provider as VoiceProvider,
    offer: call.offer,
    setup: call.setup,
    briefing: context.briefing(call.sessionId),
  };
};

// A Turn the call started began or ended: the idle period starts over.
const turnsChanged = {
  target: 'connected',
  reenter: true,
  actions: 'noteTurns',
} as const;

export const voiceCallMachine = voiceCallSetup.createMachine({
  id: 'voiceCall',
  context: ({ input }): VoiceCallContext => ({
    ...input,
    sessions: detachedSessions,
    call: null,
    ended: null,
    failure: null,
    turnRunning: false,
    partials: [],
  }),
  initial: 'idle',
  on: { 'sessions.attach': { actions: 'attachSessions' } },
  states: {
    idle: {
      on: {
        'call.start': {
          guard: 'hasProvider',
          target: 'running',
          actions: 'begin',
        },
      },
    },
    running: {
      invoke: [
        {
          id: 'providerCall',
          src: 'providerCall',
          input: ({ context }): ProviderCallInput => providerInput(context),
        },
        {
          id: 'agentRelay',
          src: 'agentRelay',
          input: ({ context }): RelayInput => ({
            sessions: context.sessions,
            sessionId: runningCall(context).sessionId,
            readOut: (runningCall(context).conduct ?? defaultConduct).readOut,
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
        'call.end': {
          guard: 'endsThisCall',
          target: idleTarget,
          actions: {
            type: 'finish',
            params: ({ event }): EndParameters => {
              assertEvent(event, 'call.end');

              return { reason: event.reason };
            },
          },
        },
        'call.sessionGone': {
          target: idleTarget,
          actions: {
            type: 'finish',
            params: ({ event }): EndParameters => {
              assertEvent(event, 'call.sessionGone');

              return { reason: event.reason };
            },
          },
        },
        'call.appDisconnected': {
          target: idleTarget,
          actions: endsWith('app-disconnected'),
        },
        'call.failed': {
          target: idleTarget,
          actions: ['recordFailure', 'announceFailure', endsWith('failed')],
        },
        'call.turns': { actions: 'noteTurns' },
        'provider.event': [
          {
            guard: 'hearsTranscript',
            actions: ['storeTranscript', 'trackPartials'],
          },
          {
            guard: 'providerErrored',
            target: idleTarget,
            actions: [
              'recordProviderFailure',
              'announceFailure',
              endsWith('failed'),
            ],
          },
          {
            guard: 'limitClosed',
            target: idleTarget,
            actions: ['noticeLimit', endsWith('limit-reached')],
          },
          {
            guard: 'providerClosed',
            target: idleTarget,
            actions: endsWith('provider-closed'),
          },
          {
            guard: 'asksForWork',
            actions: sendTo('agentRelay', ({ event }) => event),
          },
          { actions: 'foldProvider' },
        ],
        'session.turn': { guard: 'turnChanged', actions: 'foldTurn' },
        'voice.say': {
          actions: sendTo('providerCall', ({ event }) => event),
        },
      },
      states: {
        starting: {
          on: {
            'call.answered': { target: 'connecting', actions: 'answer' },
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
                actions: ['storeTranscript', 'trackPartials'],
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

export type VoiceCallActorRef = ActorRefFrom<typeof voiceCallMachine>;
