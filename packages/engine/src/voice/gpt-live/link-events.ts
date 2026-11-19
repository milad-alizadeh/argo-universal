import { z } from 'zod';
import type { VoiceProviderEvent } from '../provider';

/*
 * The control link's events as the service sends them ("frameless bidi"); Codex reads the same ones (codex-rs realtime_websocket/protocol_frameless_bidi.rs).
 * Words arrive a chunk at a time as `*_transcript.added`; a turn's `turn.done` holds its whole transcript, which is what was said.
 * `session.usage.updated` counts audio time, not tokens, so it is not reported.
 */

type Speaker = 'person' | 'voice';

type Utterance = { id: string; text: string };

// Each speaker's words so far in the utterance under way.
type Saying = Map<Speaker, Utterance>;

// What one event does to the call: the events it reports, given the words so far.
type Step = (saying: Saying) => VoiceProviderEvent[];

const transcriptType = {
  person: 'person.transcript',
  voice: 'voice.transcript',
} as const;

const report =
  (...events: VoiceProviderEvent[]): Step =>
  () =>
    events;

const partial = (speaker: Speaker, now: Utterance): VoiceProviderEvent[] => {
  const text = now.text.trimStart();

  if (!text) return [];

  return [{ type: transcriptType[speaker], id: now.id, text, final: false }];
};

// A partial carries the utterance up to now, under the id of its first chunk.
const wordsAdded =
  (speaker: Speaker) =>
  ({ item }: { item: Utterance }): Step =>
  (saying) => {
    const before = saying.get(speaker) ?? { id: item.id, text: '' };
    const now = { id: before.id, text: before.text + item.text };

    saying.set(speaker, now);

    return partial(speaker, now);
  };

// A done turn's transcript is the whole utterance; the speaker's next words start afresh.
const turnDone =
  (speaker: Speaker, ...after: VoiceProviderEvent[]) =>
  ({ turn }: { turn: { id: string; transcript: string } }): Step =>
  (saying) => {
    const text = turn.transcript.trim();

    saying.delete(speaker);

    if (!text) return after;

    return [
      { type: transcriptType[speaker], id: turn.id, text, final: true },
      ...after,
    ];
  };

// Work the voice hands to the client, answered under the delegation item's id as Codex does.
const requested = ({
  item,
}: {
  item: { id: string; content: { type: string; text: string }[] };
}): Step =>
  report({
    type: 'work.requested',
    requestId: item.id,
    text: item.content
      .filter((part) => part.type === 'input_text')
      .map((part) => part.text)
      .join(''),
  });

const wordsFields = {
  item: z.looseObject({ id: z.string(), text: z.string() }),
};

const turnFields = { id: z.string(), transcript: z.string().default('') };

const userTurn = {
  turn: z.looseObject({ ...turnFields, role: z.literal('user') }),
};

const assistantTurn = {
  turn: z.looseObject({ ...turnFields, role: z.literal('assistant') }),
};

const delegation = z.looseObject({
  type: z.literal('delegation.created'),
  item: z.looseObject({
    id: z.string(),
    type: z.literal('delegation'),
    target: z.literal('client'),
    content: z.array(z.looseObject({ type: z.string(), text: z.string() })),
  }),
});

// Audio never reaches this: binary frames are dropped before they are read, and events the provider does not report match nothing here.
const reported = z.union([
  z
    .looseObject({ type: z.literal('session.started') })
    .transform(() => report({ type: 'status', status: 'connected' })),
  z
    .looseObject({ type: z.literal('input_transcript.added'), ...wordsFields })
    .transform(wordsAdded('person')),
  z
    .looseObject({ type: z.literal('output_transcript.added'), ...wordsFields })
    .transform(wordsAdded('voice')),
  z
    .looseObject({ type: z.literal('turn.created'), ...assistantTurn })
    .transform(() => report({ type: 'speaking', speaking: true })),
  z
    .looseObject({ type: z.literal('turn.done'), ...userTurn })
    .transform(turnDone('person')),
  z
    .looseObject({ type: z.literal('turn.done'), ...assistantTurn })
    .transform(turnDone('voice', { type: 'speaking', speaking: false })),
  delegation.transform(requested),
  z
    .looseObject({ type: z.literal('session.closed') })
    .transform(() => report({ type: 'closed', reason: 'ended' })),
]);

const stepOf = (frame: string): Step | null => {
  try {
    const parsed = reported.safeParse(JSON.parse(frame));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

// Reads one call's control-link text frames, keeping each speaker's words so far across frames.
export class LinkReader {
  private readonly saying: Saying = new Map();

  // What one text frame means to the call; nothing for events not reported and for anything unreadable.
  public read(frame: string): VoiceProviderEvent[] {
    return stepOf(frame)?.(this.saying) ?? [];
  }
}

// Only a text frame is an event; audio frames are dropped unread.
export const textOfFrame = (
  data: Buffer | ArrayBuffer | Buffer[],
  isBinary: boolean,
): string => (Buffer.isBuffer(data) && !isBinary ? data.toString('utf8') : '');
