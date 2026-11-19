import type {
  VoiceAvailability,
  VoiceConnectionStatus,
  VoiceLimit,
  VoiceTrouble,
} from '@repo/contracts';

/*
 * The Voice provider interface (ADR-0063). It names no vendor: only a provider's own module does.
 * A provider starts a Voice call from the App's offer, reports what was said and asked for, accepts text to speak or to keep as background, and ends the call. Audio travels straight between the App and the provider; the Engine only relays the offer and the answer.
 */

// Why a provider closed a call; `limit` is a call closed because the person's allowance ran out.
export type VoiceClosedReason = 'ended' | 'lost' | 'error' | 'limit';

export type VoiceProviderEvent =
  | { type: 'status'; status: VoiceConnectionStatus }
  // What the person said; `final` is false while the words may still change.
  | { type: 'person.transcript'; id: string; text: string; final: boolean }
  // What the voice said; `final` is false while it is still speaking.
  | { type: 'voice.transcript'; id: string; text: string; final: boolean }
  // The person asked for work; answer it with `reply` under this id.
  | { type: 'work.requested'; requestId: string; text: string }
  // The voice started or stopped speaking.
  | { type: 'speaking'; speaking: boolean }
  // Trouble on the person's side of the call, such as a microphone the App may not use; null once it clears. Reconnecting is the Engine's to say.
  | { type: 'trouble'; trouble: Exclude<VoiceTrouble, 'reconnecting'> | null }
  // What the call has used so far; `limit` is the allowance left when the report says so.
  | {
      type: 'usage';
      inputTokens: number;
      outputTokens: number;
      limit?: VoiceLimit;
    }
  // How much of the provider's allowance is left, as a fraction from 0 to 1.
  | ({ type: 'limit' } & VoiceLimit)
  | { type: 'closed'; reason: VoiceClosedReason };

// What the voice does with text it is given: say it aloud, or keep it as background it may use later.
export type VoiceDelivery = 'speak' | 'background';

export interface VoiceStartRequest {
  // The App's connection offer.
  offer: string;
  // What the voice is told about the Session before it speaks.
  briefing: string;
  // A voice the provider lists; the provider's own default when left out.
  voice?: string;
}

// A call that only lets the person hear a voice: it opens no microphone and its voice says `words` once.
export interface VoicePreviewRequest {
  // The App's connection offer; it carries no microphone.
  offer: string;
  voice: string;
  words: string;
}

export interface VoiceProviderCall {
  // The connection answer the App completes its connection with.
  readonly answer: string;
  // Listen to the call; the returned function stops listening.
  listen: (listener: (event: VoiceProviderEvent) => void) => () => void;
  // Answer a request for work.
  reply: (requestId: string, text: string, delivery: VoiceDelivery) => void;
  // Tell the voice something it did not ask for.
  tell: (text: string, delivery: VoiceDelivery) => void;
  // End the call; ending an ended call does nothing.
  end: () => void;
}

export interface VoiceOption {
  id: string;
  label: string;
  // Only what the provider itself publishes about the voice.
  description?: string;
}

export interface VoiceProvider {
  // What Settings lists the provider by: a stable id, its name, and whether it is still experimental.
  readonly id: string;
  readonly label: string;
  readonly experimental: boolean;
  // Whether a call can start now, and if not, why.
  availability: () => Promise<VoiceAvailability>;
  voices: () => Promise<VoiceOption[]>;
  start: (request: VoiceStartRequest) => Promise<VoiceProviderCall>;
  // A call whose voice speaks the request's words first; the caller ends it.
  preview: (request: VoicePreviewRequest) => Promise<VoiceProviderCall>;
}
