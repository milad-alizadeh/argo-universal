import { z } from 'zod';

// Longest description a custom voice keeps; it is sent with every call's instructions.
const descriptionLimit = 2000;

const labelLimit = 60;

// A voice a Voice provider speaks with; `description` only where the provider publishes one.
export const VoiceOption = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
});

export type VoiceOption = z.infer<typeof VoiceOption>;

// A voice the person made: one of the provider's built-in voices, told how to speak by `description`.
export const CustomVoice = z.strictObject({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(labelLimit),
  baseVoice: z
    .string()
    .min(1)
    .describe('The id of the built-in voice it speaks with.'),
  description: z
    .string()
    .trim()
    .min(1)
    .max(descriptionLimit)
    .describe("How the voice speaks, sent with the call's instructions."),
});

export type CustomVoice = z.infer<typeof CustomVoice>;

// Input of `voice.saveCustomVoice`: a new custom voice, or the one `id` names changed.
export const CustomVoiceInput = CustomVoice.extend({
  id: z
    .string()
    .min(1)
    .optional()
    .describe('The custom voice to change; left out to add a new one.'),
});

export type CustomVoiceInput = z.infer<typeof CustomVoiceInput>;

// A voice to choose from: one the provider has, or one the person made.
export const ListedVoice = z.discriminatedUnion('kind', [
  VoiceOption.extend({ kind: z.literal('builtIn') }),
  CustomVoice.extend({ kind: z.literal('custom') }),
]);

export type ListedVoice = z.infer<typeof ListedVoice>;

// Output of `voice.listVoices`: the provider's voices, then the person's own.
export const VoiceList = z.strictObject({ voices: z.array(ListedVoice) });

export type VoiceList = z.infer<typeof VoiceList>;

// Input of `voice.setVoice`.
export const VoiceChoice = z.strictObject({
  voice: z
    .string()
    .min(1)
    .describe('The id of a built-in or custom voice, from voice.listVoices.'),
});

export type VoiceChoice = z.infer<typeof VoiceChoice>;

// Input of `voice.deleteCustomVoice`.
export const CustomVoiceId = z.strictObject({ id: z.string().min(1) });

export type CustomVoiceId = z.infer<typeof CustomVoiceId>;

// Longest custom instructions kept; they are sent with every call.
const instructionsLimit = 4000;

// Input of `voice.setInstructions`: an empty text removes them.
export const VoiceInstructions = z.strictObject({
  instructions: z
    .string()
    .trim()
    .max(instructionsLimit)
    .describe(
      "What every Voice call is told after Argo's own instructions; empty for none.",
    ),
});

export type VoiceInstructions = z.infer<typeof VoiceInstructions>;
