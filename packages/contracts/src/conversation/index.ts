import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ConversationOptions } from './options';
import { CustomVoice, VoiceOption } from '../voice/voices';

export * from './options';

export * from './devices';


// How far a running Conversation has come: the Conversation provider has the App's offer and answered, then reports the Conversation joined.
export const ConversationPhase = z.enum(['connecting', 'connected']);

export type ConversationPhase = z.infer<typeof ConversationPhase>;

// What the Conversation's band shows: the person is heard, the voice talks, the Agent's Turn runs, or the Conversation has no sound to show.
export const ConversationState = z.enum([
  'listening',
  'talking',
  'thinking',
  'none',
]);

export type ConversationState = z.infer<typeof ConversationState>;

// Trouble the Conversation shows in the band's label instead of a dialog.
export const ConversationTrouble = z.enum(['reconnecting', 'microphone-blocked']);

export type ConversationTrouble = z.infer<typeof ConversationTrouble>;

// Why a Conversation stopped (ADR-0064).
export const ConversationEnd = z.enum([
  'person',
  'agent',
  'idle',
  'limit-reached',
  'session-closed',
  'session-archived',
  'app-disconnected',
  'engine-stopped',
  'provider-closed',
  'failed',
]);

export type ConversationEnd = z.infer<typeof ConversationEnd>;

const conversationSessionId = sessionColumns.shape.id;

// The provider's allowance, reported while the Conversation runs: how much is left as a fraction from 0 to 1.
export const ConversationLimit = z.strictObject({
  remaining: z.number().min(0).max(1),
  resetsAt: z.string().min(1).optional(),
});

export type ConversationLimit = z.infer<typeof ConversationLimit>;

// The one Conversation a Server runs, and the Session it is attached to for its whole life.
export const Conversation = z.strictObject({
  conversationId: z.string().min(1),
  sessionId: conversationSessionId,
  status: ConversationPhase,
  state: ConversationState,
  trouble: ConversationTrouble.nullable(),
  startedAt: z
    .string()
    .min(1)
    .nullable()
    .describe(
      'When the Conversation first connected, as a date and time; null until then.',
    ),
  // Set once the provider reports its allowance running low; absent until then.
  limit: ConversationLimit.optional(),
});

export type Conversation = z.infer<typeof Conversation>;

// Whether the Conversation provider can start a Conversation now, and if not, why.
export const ConversationAvailability = z.discriminatedUnion('usable', [
  z.strictObject({ usable: z.literal(true) }),
  z.strictObject({ usable: z.literal(false), reason: z.string().min(1) }),
]);

export type ConversationAvailability = z.infer<typeof ConversationAvailability>;

export const VoiceSpeaker = z.enum(['person', 'voice']);

export type VoiceSpeaker = z.infer<typeof VoiceSpeaker>;

// Words that may still change: live state of the running Conversation, never a stored Feed row. A final transcript replaces it.
export const ConversationPartial = z.strictObject({
  speaker: VoiceSpeaker,
  id: z.string().min(1),
  rowId: z
    .string()
    .min(1)
    .describe(
      'The Feed row the final words are stored as, so the App draws the partial and that row as one row.',
    ),
  text: z.string(),
});

export type ConversationPartial = z.infer<typeof ConversationPartial>;

// What the App draws its Composer from: the running Conversation, how the last one ended, and whether a new one can start.
export const ConversationStatus = z.strictObject({
  conversation: Conversation.nullable(),
  ended: z
    .strictObject({
      conversationId: z.string().min(1),
      sessionId: conversationSessionId,
      reason: ConversationEnd,
    })
    .nullable(),
  availability: ConversationAvailability,
  // Whether the person keeps Conversations on; with them off no Composer offers the voice button.
  enabled: z.boolean(),
  // What is being said now, at most one per speaker; drawn at the tail of the Conversation's Session's Feed.
  partials: z.array(ConversationPartial),
  // The App plays the voice this loud and sends the microphone at this gain, a running Conversation included.
  volume: ConversationOptions.shape.volume,
  microphoneGain: ConversationOptions.shape.microphoneGain,
});

export type ConversationStatus = z.infer<typeof ConversationStatus>;

// Input of `conversation.start`: the App's connection offer for the Session the Conversation speaks for.
export const ConversationStartInput = z.strictObject({
  sessionId: conversationSessionId,
  offer: z.string().min(1).describe("The App's connection offer."),
});

export type ConversationStartInput = z.infer<typeof ConversationStartInput>;

// Output of `conversation.start`: the connection answer the App completes its connection with.
export const ConversationStartOutput = z.strictObject({
  conversationId: z.string().min(1),
  answer: z.string().min(1),
});

export type ConversationStartOutput = z.infer<typeof ConversationStartOutput>;

// Input of `conversation.end`: the calling Session's Conversation unless the params name another Session.
export const ConversationEndInput = z.strictObject({
  sessionId: conversationSessionId
    .optional()
    .describe(
      'The Session whose Conversation ends; the calling Session when left out.',
    ),
});

export type ConversationEndInput = z.infer<typeof ConversationEndInput>;

export const ConversationEndOutput = z.strictObject({ ended: z.boolean() });

export type ConversationEndOutput = z.infer<typeof ConversationEndOutput>;

// A Conversation provider the Server lists, and whether it can be used now.
export const ConversationProviderOption = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  experimental: z.boolean(),
  availability: ConversationAvailability,
});

export type ConversationProviderOption = z.infer<typeof ConversationProviderOption>;

/*
 * Settings › Conversation: what the person chose, and what they can choose from. `provider` and `voice` are null while the
 * Server has no provider; `voice` is a built-in voice's id or a custom voice's.
 */
export const ConversationSettings = z.strictObject({
  enabled: z.boolean(),
  provider: z.string().min(1).nullable(),
  voice: z.string().min(1).nullable(),
  providers: z.array(ConversationProviderOption),
  voices: z.array(VoiceOption),
  customVoices: z.array(CustomVoice),
  instructions: z.string(),
  options: ConversationOptions,
});

export type ConversationSettings = z.infer<typeof ConversationSettings>;

// What `conversation.setSettings` changes; what is left out stays.
export const ConversationSettingsChange = z.strictObject({
  enabled: z.boolean().optional(),
  provider: z.string().min(1).optional(),
  voice: z.string().min(1).optional(),
});

export type ConversationSettingsChange = z.infer<typeof ConversationSettingsChange>;
