import type {
  ConversationAvailability,
  ConversationLimit,
  ConversationTrouble,
} from '@repo/contracts';

/*
 * The Conversation provider interface (ADR-0064). It names no vendor: only a provider's own module does.
 * A provider starts a Conversation from the App's offer, reports what was said and asked for, accepts text to speak or to keep as background, and ends the call. Audio travels straight between the App and the provider; the Engine only relays the offer and the answer.
 */

// The connection's standing as the provider sees it; `disconnected` is a call trying to reconnect. It stays behind the provider seam: the App reads the call's status and trouble instead.
export type ConversationConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

// Why a provider closed a call; `limit` is a call closed because the person's allowance ran out.
export type ConversationClosedReason = 'ended' | 'lost' | 'error' | 'limit';

export type ConversationProviderEvent =
  | { type: 'status'; status: ConversationConnectionStatus }
  // What the person said; `final` is false while the words may still change.
  | { type: 'person.transcript'; id: string; text: string; final: boolean }
  // What the voice said; `final` is false while it is still speaking.
  | { type: 'voice.transcript'; id: string; text: string; final: boolean }
  // The person asked for work; answer it with `reply` under this id. `turnId` is the person's turn it was heard in, when the provider names one: the id their transcript comes under.
  | { type: 'work.requested'; requestId: string; text: string; turnId?: string }
  // The voice started or stopped speaking.
  | { type: 'speaking'; speaking: boolean }
  // Trouble on the person's side of the call, such as a microphone the App may not use; null once it clears. Reconnecting is the Engine's to say.
  | {
      type: 'trouble';
      trouble: Exclude<ConversationTrouble, 'reconnecting'> | null;
    }
  // What the call has used so far; `limit` is the allowance left when the report says so.
  | {
      type: 'usage';
      inputTokens: number;
      outputTokens: number;
      limit?: ConversationLimit;
    }
  // How much of the provider's allowance is left, as a fraction from 0 to 1.
  | ({ type: 'limit' } & ConversationLimit)
  // Something worth keeping in the Server's log about how the call goes, such as a dropped link; never shown, never audio or tokens.
  | { type: 'trail'; note: string }
  // `why` is the provider's own reason in plain words, for the Notice that says why the call ended.
  | { type: 'closed'; reason: ConversationClosedReason; why?: string };

// What the voice does with text it is given: say it aloud, or keep it as background it may use later.
export type VoiceDelivery = 'speak' | 'background';

// What the person chose for every call: the voice, how it speaks, and what it is told.
export interface ConversationSetup {
  // A voice the provider lists; the provider's own default when left out.
  voice?: string;
  // How a custom voice speaks; told to the voice after the provider's own instructions.
  style?: string;
  // The person's custom instructions; told after the style.
  instructions?: string;
  // Whether the voice says a short line when it hands a request over; the provider's own default when left out.
  filler?: boolean;
  // What the voice is given before the call starts, such as how to greet the person.
  opening?: string;
}

export interface ConversationStartRequest extends ConversationSetup {
  // The App's connection offer.
  offer: string;
  // What the voice is told about the Session before it speaks; it comes last.
  briefing: string;
}

// A call that only lets the person hear a voice: it opens no microphone and its voice says `words` once.
export interface VoicePreviewRequest {
  // The App's connection offer; it carries no microphone.
  offer: string;
  voice: string;
  // How a custom voice speaks, so the person hears it before saving it.
  style?: string;
  words: string;
}

export interface ConversationProviderCall {
  // The connection answer the App completes its connection with.
  readonly answer: string;
  // Listen to the call; the returned function stops listening.
  listen: (listener: (event: ConversationProviderEvent) => void) => () => void;
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

export interface ConversationProvider {
  // What Settings lists the provider by: a stable id, its name, and whether it is still experimental.
  readonly id: string;
  readonly label: string;
  readonly experimental: boolean;
  // Whether a call can start now, and if not, why.
  availability: () => Promise<ConversationAvailability>;
  voices: () => Promise<VoiceOption[]>;
  start: (
    request: ConversationStartRequest,
  ) => Promise<ConversationProviderCall>;
  // A call whose voice speaks the request's words first; the caller ends it.
  preview: (request: VoicePreviewRequest) => Promise<ConversationProviderCall>;
}
