import { z } from 'zod';
import type { VoiceProviderEvent } from '../provider';

const speechFields = { id: z.string().default(''), transcript: z.string() };

const speech =
  (type: 'person.transcript' | 'voice.transcript') =>
  ({
    id,
    transcript,
  }: {
    id: string;
    transcript: string;
  }): VoiceProviderEvent => ({
    type,
    id,
    text: transcript,
    final: true,
  });

const connected = (): VoiceProviderEvent => ({
  type: 'status',
  status: 'connected',
});

const closed = (): VoiceProviderEvent => ({ type: 'closed', reason: 'ended' });

const requested = ({
  delegation_id: requestId,
  text,
}: {
  delegation_id: string;
  text: string;
}): VoiceProviderEvent => ({ type: 'work.requested', requestId, text });

const counted = ({
  usage,
}: {
  usage: { input_tokens: number; output_tokens: number };
}): VoiceProviderEvent => ({
  type: 'usage',
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
});

const usageFields = {
  usage: z.looseObject({ input_tokens: z.number(), output_tokens: z.number() }),
};

// Audio never reaches this: binary frames are dropped before they are read, and events the provider does not report match nothing here.
const reported = z.union([
  z.looseObject({ type: z.literal('session.started') }).transform(connected),
  z
    .looseObject({ type: z.literal('input_transcript.added'), ...speechFields })
    .transform(speech('person.transcript')),
  z
    .looseObject({
      type: z.literal('output_transcript.added'),
      ...speechFields,
    })
    .transform(speech('voice.transcript')),
  z
    .looseObject({
      type: z.literal('delegation.created'),
      delegation_id: z.string(),
      text: z.string(),
    })
    .transform(requested),
  z
    .looseObject({ type: z.literal('session.usage.updated'), ...usageFields })
    .transform(counted),
  z.looseObject({ type: z.literal('session.closed') }).transform(closed),
]);

// What one control-link text frame means to a call; null for events not reported and for anything unreadable.
export function eventOfFrame(frame: string): VoiceProviderEvent | null {
  try {
    const parsed = reported.safeParse(JSON.parse(frame));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Only a text frame is an event; audio frames are dropped unread.
export const textOfFrame = (
  data: Buffer | ArrayBuffer | Buffer[],
  isBinary: boolean,
): string => (Buffer.isBuffer(data) && !isBinary ? data.toString('utf8') : '');
