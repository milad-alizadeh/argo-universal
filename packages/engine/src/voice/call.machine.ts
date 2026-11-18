import type { VoiceCallEnd, VoiceLimit } from '@repo/contracts';
import { assertEvent, assign, sendTo, setup, type ActorRefFrom } from 'xstate';
import { agentRelay, type RelayInput } from './agent-relay-actor';
import {
  runningCall,
  type RunningCall,
  type VoiceCallContext,
  type VoiceCallEvent,
  type VoiceCallInput,
} from './call-types';
import { watchConnection, watchSession } from './call-watchers';
import type { VoiceProvider, VoiceProviderEvent } from './provider';
import { providerCall, type ProviderCallInput } from './provider-call';
import { SessionLink } from './session-link';
import { isTranscript, storeTranscript, withTranscript } from './transcript';

/*
 * The Voice call's lifecycle (ADR-0063): one machine for the one call a Server runs, attached to one Session for its whole life.
 * It is not part of the Session machine or the Agent machine; it watches its Session and the App's Connection from outside.
 * Provider events other than the connection's own pass through `provider.event` for the transcript, request and usage work that builds on this.
 */

export const voiceCallSystemId = 'voice';

type EndParameters = { reason: VoiceCallEnd };

const isConnectedStatus = (event: VoiceProviderEvent): boolean =>
  event.type === 'status' && event.status === 'connected';

const isErrorStatus = (event: VoiceProviderEvent): boolean =>
  event.type === 'status' && event.status === 'error';

const isErrorClose = (event: VoiceProviderEvent): boolean =>
  event.type === 'closed' && event.reason === 'error';

function providerEventOf(event: VoiceCallEvent): VoiceProviderEvent {
  assertEvent(event, 'provider.event');

  return event.event;
}

const isLimitClose = (event: VoiceProviderEvent): boolean =>
  event.type === 'closed' && event.reason === 'limit';

function limitOf(event: VoiceCallEvent): VoiceLimit {
  const reported = providerEventOf(event);

  if (reported.type !== 'limit') throw new Error('Not a limit report');
  const { remaining, resetsAt } = reported;

  return resetsAt === undefined ? { remaining } : { remaining, resetsAt };
}

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
  delays: { idle: ({ context }): number => context.idleMs },
  actors: { providerCall, agentRelay, watchSession, watchConnection },
  actions: {
    begin: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.start');
      const { callId, sessionId, offer, voice, connection } = event;

      return {
        call: { callId, sessionId, offer, voice, connection, answer: null },
        ended: null,
        failure: null,
        turnRunning: false,
      };
    }),
    answer: assign(({ context, event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.answered');

      return { call: { ...runningCall(context), answer: event.answer } };
    }),
    noteLimit: assign(({ context, event }): Partial<VoiceCallContext> => ({
      call: { ...runningCall(context), limit: limitOf(event) },
    })),
    noteTurns: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.turns');

      return { turnRunning: event.running };
    }),
    // Tells the person, in the Session's Feed, why the call ended.
    noticeLimit: ({ context }): void =>
      context.sessions.current?.notice(
        runningCall(context).sessionId,
        limitNotice,
      ),
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
    providerErrored: ({ event }): boolean => {
      const reported = providerEventOf(event);

      return isErrorStatus(reported) || isErrorClose(reported);
    },
    noTurnRunning: ({ context }): boolean => !context.turnRunning,
    reportsLimit: ({ event }): boolean =>
      providerEventOf(event).type === 'limit',
    limitClosed: ({ event }): boolean => isLimitClose(providerEventOf(event)),
    providerClosed: ({ event }): boolean =>
      providerEventOf(event).type === 'closed',
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
  const { offer, sessionId, voice } = runningCall(context);

  return {
    // SAFETY: `call.start` is refused without a provider, so `running` always has one.
    provider: context.provider as VoiceProvider,
    offer,
    voice,
    briefing: context.briefing(sessionId),
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
    sessions: new SessionLink(),
    call: null,
    ended: null,
    failure: null,
    turnRunning: false,
    partials: [],
  }),
  initial: 'idle',
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
          actions: ['recordFailure', endsWith('failed')],
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
            actions: endsWith('failed'),
          },
          { guard: 'reportsLimit', actions: 'noteLimit' },
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
        ],
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
          on: {
            'provider.event': {
              guard: 'hearsTranscript',
              actions: ['storeTranscript', 'trackPartials'],
              target: 'connected',
              reenter: true,
            },
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
      },
    },
  },
});

export type VoiceCallActorRef = ActorRefFrom<typeof voiceCallMachine>;
