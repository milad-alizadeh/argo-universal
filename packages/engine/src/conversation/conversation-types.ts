import type { ConversationEnd, ConversationLimit, ConversationPartial } from '@repo/contracts';
import type {
  ConversationSetup,
  VoiceDelivery,
  ConversationProvider,
  ConversationProviderEvent,
} from './provider';
import type { ConversationSessions } from './session-link';
import type { ReadOut } from './transcript';

export type SessionGoneReason = Extract<
  ConversationEnd,
  'session-closed' | 'session-archived'
>;

// Something the Engine tells the voice: the answer to a request for work, a word it did not ask for, or an Agent's result for it to read out.
export type VoiceSay =
  | { kind: 'reply'; requestId: string; text: string; delivery: VoiceDelivery }
  | { kind: 'tell' | 'result'; text: string; delivery: VoiceDelivery };

// How Argo runs one call, whatever the provider: when silence ends it.
export interface CallConduct {
  idleMs: number;
}

// The call a relay serves: its Session.
export interface RelayCall {
  sessionId: string;
}

export type ConversationEvent =
  | {
      type: 'call.start';
      conversationId: string;
      sessionId: string;
      offer: string;
      // The voice the call speaks with and what it is told; the provider's own when left out.
      setup?: ConversationSetup;
      conduct?: CallConduct;
      // The App Connection that started the call; the call ends when it closes.
      connection?: AbortSignal;
    }
  | { type: 'call.end'; reason: ConversationEnd; sessionId?: string }
  | { type: 'call.answered'; answer: string }
  | { type: 'call.failed'; message: string }
  | { type: 'call.sessionGone'; reason: SessionGoneReason }
  // The Session's Turn started or stopped running.
  | { type: 'session.turn'; running: boolean }
  | { type: 'call.appDisconnected' }
  // Whether a Turn the call started is running.
  | { type: 'call.turns'; running: boolean }
  | { type: 'provider.event'; event: ConversationProviderEvent }
  | { type: 'voice.say'; say: VoiceSay }
  // The Sessions the call sends Prompts to and listens to, once they exist.
  | { type: 'sessions.attach'; sessions: ConversationSessions };

export type SendBack = (event: ConversationEvent) => void;

export const sessionGone = (reason: SessionGoneReason): ConversationEvent => ({
  type: 'call.sessionGone',
  reason,
});

export const providerEvent = (event: ConversationProviderEvent): ConversationEvent => ({
  type: 'provider.event',
  event,
});

export interface ConversationInput {
  // Absent when no Conversation provider is configured.
  provider: ConversationProvider | null;
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
  conversationId: string;
  sessionId: string;
  offer: string;
  setup?: ConversationSetup;
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
  limit?: ConversationLimit;
  // The tokens the provider last reported the call has used.
  usage?: { inputTokens: number; outputTokens: number };
  // What the provider noted about the call for the Server's log, latest last.
  trail: string[];
}

export interface EndedCall {
  conversationId: string;
  sessionId: string;
  reason: ConversationEnd;
}

// Why the machine refused a start: a call already runs, no Conversation provider is configured, or the Session is not open.
export type StartRefusal = 'call-running' | 'no-provider' | 'session-not-open';

// The last start the machine refused; a start finds its own by its conversationId.
interface RefusedStart {
  conversationId: string;
  refusal: StartRefusal;
}

export interface ConversationContext extends ConversationInput {
  // Where the call reaches its Session, filled in once Sessions exist.
  sessions: ConversationSessions;
  call: RunningCall | null;
  ended: EndedCall | null;
  // Why the last call failed, for the Notice that says so.
  failure: string | null;
  refused: RefusedStart | null;
  // Whether a Turn the call started is running; an idle call never ends while one is.
  turnRunning: boolean;
  // Words being said now that may still change; live state, never stored.
  partials: ConversationPartial[];
  // The voice is reading out an Agent's result, which is neither stored nor drawn.
  readOut: ReadOut | null;
}

// The provider a running call speaks through; `call.start` is refused without one.
export function callProvider(context: ConversationContext): ConversationProvider {
  if (!context.provider) throw new Error('No Conversation provider is configured');

  return context.provider;
}

// The call `running` was entered for; `running` is only entered by `call.start`, which sets it.

export function runningCall(context: ConversationContext): RunningCall {
  if (!context.call) throw new Error('No Conversation is running');

  return context.call;
}
