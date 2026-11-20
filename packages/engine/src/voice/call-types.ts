import type { VoiceCallEnd, VoiceLimit, VoicePartial } from '@repo/contracts';
import type { ScreenImage } from '@repo/contracts/operations';
import type {
  VoiceCallSetup,
  VoiceDelivery,
  VoiceProvider,
  VoiceProviderEvent,
} from './provider';
import type { VoiceSessions } from './session-link';

export type SessionGoneReason = Extract<
  VoiceCallEnd,
  'session-closed' | 'session-archived'
>;

// Something the Engine tells the voice: the answer to a request for work, or a word it did not ask for.
export type VoiceSay =
  | { kind: 'reply'; requestId: string; text: string; delivery: VoiceDelivery }
  | { kind: 'tell'; text: string; delivery: VoiceDelivery }
  // One still picture of the screen, given to the voice as background and never kept.
  | { kind: 'image'; image: ScreenImage };

// How Argo runs one call, whatever the provider: when silence ends it.
export interface CallConduct {
  idleMs: number;
}

// The call a relay serves: its Session.
export interface RelayCall {
  sessionId: string;
  // Whether the call's provider can be given an image.
  images: boolean;
}

export type VoiceCallEvent =
  | {
      type: 'call.start';
      callId: string;
      sessionId: string;
      offer: string;
      // The voice the call speaks with and what it is told; the provider's own when left out.
      setup?: VoiceCallSetup;
      conduct?: CallConduct;
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
  | { type: 'voice.say'; say: VoiceSay }
  // The Sessions the call sends Prompts to and listens to, once they exist.
  | { type: 'sessions.attach'; sessions: VoiceSessions };

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
  // Overrides the idle timeout every call starts with, in milliseconds; tests shorten it.
  idleMs?: number;
  // Writes a line to the Server's log.
  log: (line: string) => void;
  // The time now, in milliseconds since the epoch.
  now: () => number;
  // Whether the Session is open, so a call can start in it.
  sessionOpen: (sessionId: string) => boolean;
}

export interface RunningCall {
  callId: string;
  sessionId: string;
  offer: string;
  setup?: VoiceCallSetup;
  conduct?: CallConduct;
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
  // The tokens the provider last reported the call has used.
  usage?: { inputTokens: number; outputTokens: number };
  // What the provider noted about the call for the Server's log, latest last.
  trail: string[];
}

export interface EndedCall {
  callId: string;
  sessionId: string;
  reason: VoiceCallEnd;
}

// Why the machine refused a start: a call already runs, no Voice provider is configured, or the Session is not open.
export type StartRefusal = 'call-running' | 'no-provider' | 'session-not-open';

// The last start the machine refused; a start finds its own by its callId.
interface RefusedStart {
  callId: string;
  refusal: StartRefusal;
}

export interface VoiceCallContext extends VoiceCallInput {
  // Where the call reaches its Session, filled in once Sessions exist.
  sessions: VoiceSessions;
  call: RunningCall | null;
  ended: EndedCall | null;
  // Why the last call failed, for the Notice that says so.
  failure: string | null;
  refused: RefusedStart | null;
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
