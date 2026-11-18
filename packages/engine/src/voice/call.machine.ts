import type { VoiceCallEnd } from '@repo/contracts';
import { assertEvent, assign, setup, type ActorRefFrom } from 'xstate';
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

/*
 * The Voice call's lifecycle (ADR-0062): one machine for the one call a Server runs, attached to one Session for its whole life.
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
  };
};

const voiceCallSetup = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as VoiceCallInput,
    context: {} as VoiceCallContext,
    events: {} as VoiceCallEvent,
  },
  actors: { providerCall, watchSession, watchConnection },
  actions: {
    begin: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.start');
      const { callId, sessionId, offer, connection } = event;

      return {
        call: { callId, sessionId, offer, connection, answer: null },
        ended: null,
        failure: null,
      };
    }),
    answer: assign(({ context, event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.answered');

      return { call: { ...runningCall(context), answer: event.answer } };
    }),
    finish: assign(({ context }, params: EndParameters) =>
      finished(context, params),
    ),
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
    isConnected: ({ event }): boolean =>
      isConnectedStatus(providerEventOf(event)),
    providerErrored: ({ event }): boolean => {
      const reported = providerEventOf(event);

      return isErrorStatus(reported) || isErrorClose(reported);
    },
    providerClosed: ({ event }): boolean =>
      providerEventOf(event).type === 'closed',
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
  const { offer, sessionId } = runningCall(context);

  return {
    // SAFETY: `call.start` is refused without a provider, so `running` always has one.
    provider: context.provider as VoiceProvider,
    offer,
    briefing: context.briefing(sessionId),
  };
};

export const voiceCallMachine = voiceCallSetup.createMachine({
  id: 'voiceCall',
  context: ({ input }): VoiceCallContext => ({
    ...input,
    call: null,
    ended: null,
    failure: null,
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
          src: 'providerCall',
          input: ({ context }): ProviderCallInput => providerInput(context),
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
        'provider.event': [
          {
            guard: 'providerErrored',
            target: idleTarget,
            actions: endsWith('failed'),
          },
          {
            guard: 'providerClosed',
            target: idleTarget,
            actions: endsWith('provider-closed'),
          },
        ],
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
        connected: {},
      },
    },
  },
});

export type VoiceCallActorRef = ActorRefFrom<typeof voiceCallMachine>;
