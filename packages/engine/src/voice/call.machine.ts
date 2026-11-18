import type { VoiceCallEnd } from '@repo/contracts';
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

type CallStart = Pick<
  RunningCall,
  'callId' | 'sessionId' | 'offer' | 'connection'
>;

// A call that has only been asked for: not answered, not connected, nobody speaking.
const newCall = (start: CallStart): RunningCall => ({
  ...start,
  answer: null,
  providerConnection: 'connecting',
  startedAt: null,
  speaking: false,
  turnRunning: false,
  microphoneBlocked: false,
});

const providerFailure = 'The connection to the voice failed.';

type Report<Type extends VoiceProviderEvent['type']> = (
  event: Extract<VoiceProviderEvent, { type: Type }>,
  call: RunningCall,
) => Partial<RunningCall>;

type Reports = { [Type in VoiceProviderEvent['type']]?: Report<Type> };

// The timer starts the first time the call connects and keeps that time through any reconnecting.
const startedAfter = (call: RunningCall, status: string): string | null =>
  status === 'connected'
    ? (call.startedAt ?? new Date().toISOString())
    : call.startedAt;

// What each provider report changes about the running call; reports not listed change nothing.
const reports: Reports = {
  status: (event, call) => ({
    providerConnection: event.status,
    startedAt: startedAfter(call, event.status),
  }),
  speaking: (event) => ({ speaking: event.speaking }),
  trouble: (event) => ({ microphoneBlocked: event.trouble !== null }),
};

// Folds what the provider reported about the call into the running call.
function reported(call: RunningCall, event: VoiceProviderEvent): RunningCall {
  // SAFETY: `reports` keys each report by the event type it reads, so the report found for `event.type` takes `event`.
  const report = reports[event.type] as Report<typeof event.type> | undefined;

  return { ...call, ...report?.(event, call) };
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
  actors: { providerCall, agentRelay, watchSession, watchConnection },
  actions: {
    begin: assign(({ event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'call.start');
      const { callId, sessionId, offer, connection } = event;

      return {
        call: newCall({ callId, sessionId, offer, connection }),
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
    recordProviderFailure: assign({ failure: providerFailure }),
    // Runs before `finish`, while the call and its Session are still known; a call ends once, so it says so once.
    announceFailure: ({ context }): void => {
      const { call, failure } = context;

      if (call && failure !== null)
        context.sessions.failed(call.sessionId, failure);
    },
    foldProvider: assign(({ context, event }): Partial<VoiceCallContext> => ({
      call: reported(runningCall(context), providerEventOf(event)),
    })),
    foldTurn: assign(({ context, event }): Partial<VoiceCallContext> => {
      assertEvent(event, 'session.turn');

      return { call: { ...runningCall(context), turnRunning: event.running } };
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
    turnChanged: ({ context, event }): boolean => {
      assertEvent(event, 'session.turn');

      return runningCall(context).turnRunning !== event.running;
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
    sessions: new SessionLink(),
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
          actions: ['recordFailure', 'announceFailure', endsWith('failed')],
        },
        'provider.event': [
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
            'provider.event': {
              guard: 'isConnected',
              target: 'connected',
              actions: 'foldProvider',
            },
          },
        },
        connected: {},
      },
    },
  },
});

export type VoiceCallActorRef = ActorRefFrom<typeof voiceCallMachine>;
