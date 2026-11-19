import type { VoiceCallEnd, VoiceLimit, VoicePartial } from '@repo/contracts';
import type {
  VoiceDelivery,
  VoiceProvider,
  VoiceProviderEvent,
} from './provider';
import type { SessionLink } from './session-link';

export type SessionGoneReason = Extract<
  VoiceCallEnd,
  'session-closed' | 'session-archived'
>;

// Something the Engine tells the voice: the answer to a request for work, or a word it did not ask for.
export type VoiceSay =
  | { kind: 'reply'; requestId: string; text: string; delivery: VoiceDelivery }
  | { kind: 'tell'; text: string; delivery: VoiceDelivery };

export type VoiceCallEvent =
  | {
      type: 'call.start';
      callId: string;
      sessionId: string;
      offer: string;
      // The voice the call speaks with; the provider's own when left out.
      voice?: string;
      // The App Connection that started the call; the call ends when it closes.
      connection?: AbortSignal;
    }
  | { type: 'call.end'; reason: VoiceCallEnd; sessionId?: string }
  | { type: 'call.answered'; answer: string }
  | { type: 'call.failed'; message: string }
  | { type: 'call.sessionGone'; reason: SessionGoneReason }
  // The Session's Turn started or stopped running.
  | { type: 'session.turn'; running: boolean }
  | { type: 'call.appDisconnected' }
  // Whether a Turn the call started is running.
  | { type: 'call.turns'; running: boolean }
  | { type: 'provider.event'; event: VoiceProviderEvent }
  | { type: 'voice.say'; say: VoiceSay };

export type SendBack = (event: VoiceCallEvent) => void;

export const sessionGone = (reason: SessionGoneReason): VoiceCallEvent => ({
  type: 'call.sessionGone',
  reason,
});

export const providerEvent = (event: VoiceProviderEvent): VoiceCallEvent => ({
  type: 'provider.event',
  event,
});

export interface VoiceCallInput {
  // Absent when no Voice provider is configured.
  provider: VoiceProvider | null;
  // What the voice is told about a Session before it speaks.
  briefing: (sessionId: string) => string;
  // How long a call may pass without speech before it ends by itself, in milliseconds.
  idleMs: number;
}

export interface RunningCall {
  callId: string;
  sessionId: string;
  offer: string;
  voice?: string;
  connection?: AbortSignal;
  answer: string | null;
  // When the call first connected.
  startedAt: string | null;
  speaking: boolean;
  // The Agent is working on the Session, whoever started its Turn.
  agentWorking: boolean;
  microphoneBlocked: boolean;
  // What the provider last reported of its allowance.
  limit?: VoiceLimit;
}

export interface EndedCall {
  callId: string;
  sessionId: string;
  reason: VoiceCallEnd;
}

export interface VoiceCallContext extends VoiceCallInput {
  // Where the call reaches its Session, filled in once Sessions exist.
  sessions: SessionLink;
  call: RunningCall | null;
  ended: EndedCall | null;
  // Why the last call failed, for the Notice that says so.
  failure: string | null;
  // Whether a Turn the call started is running; an idle call never ends while one is.
  turnRunning: boolean;
  // Words being said now that may still change; live state, never stored.
  partials: VoicePartial[];
}

// The call `running` was entered for; `running` is only entered by `call.start`, which sets it.
export function runningCall(context: VoiceCallContext): RunningCall {
  if (!context.call) throw new Error('No Voice call is running');

  return context.call;
}
