import { z } from 'zod';

const openingLimit = 2000;

const shortestIdleSeconds = 5;

const longestIdleSeconds = 3600;

const loudest = 100;

const strongestGain = 200;

// How every Conversation behaves, whichever voice speaks.
export const ConversationOptions = z.strictObject({
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
      'What the voice is given before the Conversation starts, such as how to greet the person; empty for nothing.',
    ),
  idleSeconds: z
    .number()
    .int()
    .min(shortestIdleSeconds)
    .max(longestIdleSeconds)
    .describe(
      'How long a Conversation may pass without speech before it ends.',
    ),
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

export type ConversationOptions = z.infer<typeof ConversationOptions>;

// Input of `conversation.setOptions`: what is left out stays.
export const ConversationOptionsChange = ConversationOptions.partial();

export type ConversationOptionsChange = z.infer<
  typeof ConversationOptionsChange
>;

// What a Server that was never set up uses.
export const defaultConversationOptions: ConversationOptions = {
  filler: true,
  opening: '',
  idleSeconds: 300,
  volume: 100,
  microphoneGain: 100,
};
