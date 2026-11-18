import { z } from 'zod';
import { sessionColumns } from '../columns';

// How far a running Voice call has come: the Voice provider has the App's offer and answered, then reports the call joined.
export const VoiceCallStatus = z.enum(['connecting', 'connected']);

export type VoiceCallStatus = z.infer<typeof VoiceCallStatus>;

// Why a Voice call stopped (ADR-0062).
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
