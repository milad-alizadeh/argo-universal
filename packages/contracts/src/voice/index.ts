import { z } from 'zod';
import { sessionColumns } from '../columns';
import { VoiceCallOptions } from './call-options';
import { CustomVoice, VoiceOption } from './voices';

export * from './call-options';

export * from './voices';

// How far a running Voice call has come: the Voice provider has the App's offer and answered, then reports the call joined.
export const VoiceCallStatus = z.enum(['connecting', 'connected']);

export type VoiceCallStatus = z.infer<typeof VoiceCallStatus>;

// What the call's orb shows: the person is heard, the voice talks, the Agent's Turn runs, or the call has no sound to show.
export const VoiceOrbState = z.enum([
  'listening',
  'talking',
  'thinking',
  'none',
]);

export type VoiceOrbState = z.infer<typeof VoiceOrbState>;

// Trouble the call shows in the orb's label instead of a dialog.
export const VoiceTrouble = z.enum(['reconnecting', 'microphone-blocked']);

export type VoiceTrouble = z.infer<typeof VoiceTrouble>;

// Why a Voice call stopped (ADR-0063).
export const VoiceCallEnd = z.enum([
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

export type VoiceCallEnd = z.infer<typeof VoiceCallEnd>;

const voiceSessionId = sessionColumns.shape.id;

// The provider's allowance, reported while the call runs: how much is left as a fraction from 0 to 1.
export const VoiceLimit = z.strictObject({
  remaining: z.number().min(0).max(1),
  resetsAt: z.string().min(1).optional(),
});

export type VoiceLimit = z.infer<typeof VoiceLimit>;

// The one Voice call a Server runs, and the Session it is attached to for its whole life.
export const VoiceCall = z.strictObject({
  callId: z.string().min(1),
  sessionId: voiceSessionId,
  status: VoiceCallStatus,
  orb: VoiceOrbState,
  trouble: VoiceTrouble.nullable(),
  startedAt: z
    .string()
    .min(1)
    .nullable()
    .describe(
      'When the call first connected, as a date and time; null until then.',
    ),
  // Set once the provider reports its allowance running low; absent until then.
  limit: VoiceLimit.optional(),
});

export type VoiceCall = z.infer<typeof VoiceCall>;

// Whether the Voice provider can start a call now, and if not, why.
export const VoiceAvailability = z.discriminatedUnion('usable', [
  z.strictObject({ usable: z.literal(true) }),
  z.strictObject({ usable: z.literal(false), reason: z.string().min(1) }),
]);

export type VoiceAvailability = z.infer<typeof VoiceAvailability>;

export const VoiceSpeaker = z.enum(['person', 'voice']);

export type VoiceSpeaker = z.infer<typeof VoiceSpeaker>;

// Words that may still change: live state of the running call, never a stored Feed row. A final transcript replaces it.
export const VoicePartial = z.strictObject({
  speaker: VoiceSpeaker,
  id: z.string().min(1),
  text: z.string(),
});

export type VoicePartial = z.infer<typeof VoicePartial>;

// What the App draws its Composer from: the running call, how the last one ended, and whether a new one can start.
export const VoiceStatus = z.strictObject({
  call: VoiceCall.nullable(),
  ended: z
    .strictObject({
      callId: z.string().min(1),
      sessionId: voiceSessionId,
      reason: VoiceCallEnd,
    })
    .nullable(),
  availability: VoiceAvailability,
  // Whether the person keeps Voice calls on; with them off no Composer offers the voice button.
  enabled: z.boolean(),
  // What is being said now, at most one per speaker; drawn at the tail of the call's Session's Feed.
  partials: z.array(VoicePartial),
  // The App plays the voice this loud and sends the microphone at this gain, a running call included.
  volume: VoiceCallOptions.shape.volume,
  microphoneGain: VoiceCallOptions.shape.microphoneGain,
});

export type VoiceStatus = z.infer<typeof VoiceStatus>;

// Input of `voice.start`: the App's connection offer for the Session the call speaks for.
export const VoiceStartInput = z.strictObject({
  sessionId: voiceSessionId,
  offer: z.string().min(1).describe("The App's connection offer."),
});

export type VoiceStartInput = z.infer<typeof VoiceStartInput>;

// Output of `voice.start`: the connection answer the App completes its connection with.
export const VoiceStartOutput = z.strictObject({
  callId: z.string().min(1),
  answer: z.string().min(1),
});

export type VoiceStartOutput = z.infer<typeof VoiceStartOutput>;

// Input of `voice.end`: the calling Session's Voice call unless the params name another Session.
export const VoiceEndInput = z.strictObject({
  sessionId: voiceSessionId
    .optional()
    .describe(
      'The Session whose Voice call ends; the calling Session when left out.',
    ),
});

export type VoiceEndInput = z.infer<typeof VoiceEndInput>;

export const VoiceEndOutput = z.strictObject({ ended: z.boolean() });

export type VoiceEndOutput = z.infer<typeof VoiceEndOutput>;

// A Voice provider the Server lists, and whether it can be used now.
export const VoiceProviderOption = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  experimental: z.boolean(),
  availability: VoiceAvailability,
});

export type VoiceProviderOption = z.infer<typeof VoiceProviderOption>;

/*
 * Settings › Voice: what the person chose, and what they can choose from. `provider` and `voice` are null while the
 * Server has no provider; `voice` is a built-in voice's id or a custom voice's.
 */
export const VoiceSettings = z.strictObject({
  enabled: z.boolean(),
  provider: z.string().min(1).nullable(),
  voice: z.string().min(1).nullable(),
  providers: z.array(VoiceProviderOption),
  voices: z.array(VoiceOption),
  customVoices: z.array(CustomVoice),
  instructions: z.string(),
  options: VoiceCallOptions,
});

export type VoiceSettings = z.infer<typeof VoiceSettings>;

// Input of `voice.preview`: the voice to hear, and the App's offer for a connection that only listens.
export const VoicePreviewInput = z.strictObject({
  voice: z
    .string()
    .min(1)
    .describe(
      'A built-in or custom voice; with `custom`, the built-in voice it speaks with.',
    ),
  offer: z.string().min(1).describe("The App's connection offer."),
  custom: CustomVoice.pick({ label: true, description: true })
    .optional()
    .describe('A custom voice not saved yet, heard before it is saved.'),
});

export type VoicePreviewInput = z.infer<typeof VoicePreviewInput>;

// Output of `voice.preview`: the connection answer the voice's greeting plays through.
export const VoicePreviewOutput = z.strictObject({
  answer: z.string().min(1),
});

export type VoicePreviewOutput = z.infer<typeof VoicePreviewOutput>;

// What `voice.setSettings` changes; what is left out stays.
export const VoiceSettingsChange = z.strictObject({
  enabled: z.boolean().optional(),
  provider: z.string().min(1).optional(),
  voice: z.string().min(1).optional(),
});

export type VoiceSettingsChange = z.infer<typeof VoiceSettingsChange>;
