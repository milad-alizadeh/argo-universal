import { z } from 'zod';
import { CustomVoice } from './voices';

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

// A greeting is a few seconds of speech; this leaves room for a long one and refuses anything that is not.
const maxPreviewClipCharacters = 1_500_000;

// A voice's greeting as the App recorded it: the audio as base64 and its type, such as `audio/webm`.
export const VoicePreviewClip = z.strictObject({
  mimeType: z.string().regex(/^audio\/[\w.+-]+$/),
  data: z
    .string()
    .min(1)
    .max(maxPreviewClipCharacters)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export type VoicePreviewClip = z.infer<typeof VoicePreviewClip>;

// Input of `voice.getPreviewClip`: the voice whose stored greeting is asked for, named as `voice.preview` names it.
export const VoicePreviewClipInput = VoicePreviewInput.omit({ offer: true });

export type VoicePreviewClipInput = z.infer<typeof VoicePreviewClipInput>;

// Output of `voice.getPreviewClip`: the stored greeting, or null when the Server has none yet.
export const VoicePreviewClipOutput = z.strictObject({
  clip: VoicePreviewClip.nullable(),
});

export type VoicePreviewClipOutput = z.infer<typeof VoicePreviewClipOutput>;

// Input of `voice.storePreviewClip`: the greeting the App recorded, and the voice it was recorded from.
export const VoiceStorePreviewClipInput = VoicePreviewClipInput.extend({
  clip: VoicePreviewClip,
});

export type VoiceStorePreviewClipInput = z.infer<
  typeof VoiceStorePreviewClipInput
>;

// Output of `voice.storePreviewClip`.
export const VoiceStorePreviewClipOutput = z.strictObject({
  stored: z.literal(true),
});

export type VoiceStorePreviewClipOutput = z.infer<
  typeof VoiceStorePreviewClipOutput
>;
