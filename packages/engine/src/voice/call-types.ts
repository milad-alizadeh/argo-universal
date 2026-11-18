import type { VoiceCallEnd, VoicePartial } from '@repo/contracts';
import type { VoiceProvider, VoiceProviderEvent } from './provider';

export type SessionGoneReason = Extract<
  VoiceCallEnd,
  'session-closed' | 'session-archived'
>;

export type VoiceCallEvent =
  | {
      type: 'call.start';
      callId: string;
      sessionId: string;
      offer: string;
      // The App Connection that started the call; the call ends when it closes.
      connection?: AbortSignal;
    }
  | { type: 'call.end'; reason: VoiceCallEnd; sessionId?: string }
  | { type: 'call.answered'; answer: string }
  | { type: 'call.failed'; message: string }
  | { type: 'call.sessionGone'; reason: SessionGoneReason }
  | { type: 'call.appDisconnected' }
  | { type: 'provider.event'; event: VoiceProviderEvent };

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
}

export interface RunningCall {
  callId: string;
  sessionId: string;
  offer: string;
  connection?: AbortSignal;
  answer: string | null;
}

export interface EndedCall {
  callId: string;
  sessionId: string;
  reason: VoiceCallEnd;
}

export interface VoiceCallContext extends VoiceCallInput {
  call: RunningCall | null;
  ended: EndedCall | null;
  // Why the last call failed, for the Notice that says so.
  failure: string | null;
  // Words being said now that may still change; live state, never stored.
  partials: VoicePartial[];
}

// The call `running` was entered for; `running` is only entered by `call.start`, which sets it.
export function runningCall(context: VoiceCallContext): RunningCall {
  if (!context.call) throw new Error('No Voice call is running');

  return context.call;
}
