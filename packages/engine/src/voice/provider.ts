import type { VoiceAvailability } from '@repo/contracts';

/*
 * The Voice provider interface (ADR-0062). It names no vendor: only a provider's own module does.
 * A provider starts a Voice call from the App's offer, reports what was said and asked for, accepts text to speak or to keep as background, and ends the call. Audio travels straight between the App and the provider; the Engine only relays the offer and the answer.
 */

// The connection's standing as the provider sees it: the four values of the call's connection.
type VoiceConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

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
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  // How much of the provider's allowance is left, as a fraction from 0 to 1.
  | { type: 'limit'; remaining: number; resetsAt?: string }
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
}

export interface VoiceProvider {
  // Whether a call can start now, and if not, why.
  availability: () => Promise<VoiceAvailability>;
  voices: () => Promise<VoiceOption[]>;
  start: (request: VoiceStartRequest) => Promise<VoiceProviderCall>;
}
