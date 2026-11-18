import { z } from 'zod';
import type { VoiceProviderEvent } from '../provider';

const text = z.string();

const transcript = z.looseObject({
  id: text.optional(),
  item_id: text.optional(),
  transcript: text.optional(),
  text: text.optional(),
});

const delegation = z.looseObject({
  delegation_id: text.optional(),
  id: text.optional(),
  text: text.optional(),
  request: text.optional(),
});

const usage = z.looseObject({
  usage: z
    .looseObject({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
});

const envelope = z.looseObject({ type: text });

const speech = (
  type: 'person.transcript' | 'voice.transcript',
  data: z.infer<typeof transcript>,
): VoiceProviderEvent => ({
  type,
  id: data.id ?? data.item_id ?? type,
  text: data.transcript ?? data.text ?? '',
  final: true,
});

/*
 * What one control-link text frame means to a call; null for events the provider does not report (turns, context echoes) and for anything unreadable.
 * Audio never reaches here: binary frames are dropped before they are read.
 */
export function eventOfFrame(frame: string): VoiceProviderEvent | null {
  let raw: unknown;

  try {
    raw = JSON.parse(frame);
  } catch {
    return null;
  }
  const head = envelope.safeParse(raw);

  if (!head.success) return null;

  switch (head.data.type) {
    case 'session.started':
      return { type: 'status', status: 'connected' };
    case 'input_transcript.added':
      return speech('person.transcript', transcript.parse(raw));
    case 'output_transcript.added':
      return speech('voice.transcript', transcript.parse(raw));
    case 'delegation.created': {
      const data = delegation.parse(raw);

      return {
        type: 'work.requested',
        requestId: data.delegation_id ?? data.id ?? '',
        text: data.text ?? data.request ?? '',
      };
    }
    case 'session.usage.updated': {
      const data = usage.parse(raw);
      const counts = data.usage ?? data;

      return {
        type: 'usage',
        inputTokens: counts.input_tokens ?? 0,
        outputTokens: counts.output_tokens ?? 0,
      };
    }
    case 'session.closed':
      return { type: 'closed', reason: 'ended' };
    default:
      return null;
  }
}
