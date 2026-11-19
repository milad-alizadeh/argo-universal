import { z } from 'zod';

const openingLimit = 2000;

const shortestIdleSeconds = 5;

const longestIdleSeconds = 3600;

const loudest = 100;

const strongestGain = 200;

// What the voice reads out of the Agent's work: its answers only, or its progress as it works too.
export const VoiceReadOut = z.enum(['answers', 'answersAndProgress']);

export type VoiceReadOut = z.infer<typeof VoiceReadOut>;

// How every Voice call behaves, whichever voice speaks.
export const VoiceCallOptions = z.strictObject({
  filler: z
    .boolean()
    .describe(
      'Whether the voice says a short line, such as "Sure, I\'ll take care of that", when it hands a request over.',
    ),
  opening: z
    .string()
    .trim()
    .max(openingLimit)
    .describe(
      'What the voice is given before the call starts, such as how to greet the person; empty for nothing.',
    ),
  readOut: VoiceReadOut.describe(
    "`answers`: the voice is given only the Agent's final message of a Turn. `answersAndProgress`: its progress too, as it works.",
  ),
  idleSeconds: z
    .number()
    .int()
    .min(shortestIdleSeconds)
    .max(longestIdleSeconds)
    .describe('How long a call may pass without speech before it ends.'),
  volume: z
    .number()
    .int()
    .min(0)
    .max(loudest)
    .describe("The voice's loudness on the Device, from 0 to 100."),
  microphoneGain: z
    .number()
    .int()
    .min(0)
    .max(strongestGain)
    .describe("The microphone's gain as a percentage; 100 leaves it as it is."),
});

export type VoiceCallOptions = z.infer<typeof VoiceCallOptions>;

// Input of `voice.setCallOptions`: what is left out stays.
export const VoiceCallOptionsChange = VoiceCallOptions.partial();

export type VoiceCallOptionsChange = z.infer<typeof VoiceCallOptionsChange>;

// What a Server that was never set up uses.
export const defaultVoiceCallOptions: VoiceCallOptions = {
  filler: true,
  opening: '',
  readOut: 'answersAndProgress',
  idleSeconds: 300,
  volume: 100,
  microphoneGain: 100,
};
