import { z } from 'zod';
import type { VoiceProviderEvent } from '../provider';
import {
  SpokenTurns,
  transcriptType,
  type Speaker,
  type Utterance,
} from './link-turns';
import { serviceClosed } from './service-close';

/*
 * The control link's events as the service sends them ("frameless bidi"); Codex reads the same ones (codex-rs realtime_websocket/protocol_frameless_bidi.rs).
 * Words arrive a chunk at a time as `*_transcript.added` and show as partials; a turn's `turn.done` holds its whole transcript, which is what was said.
 * A turn the person cut short is done with what was said up to then; one that ends without a transcript keeps the words heard in it (`link-turns.ts`).
 * `session.usage.updated` counts audio time, not tokens, so it is not reported.
 */

// What the call has heard so far: each speaker's words in the utterance under way, and the turns still open.
type Heard = { saying: Map<Speaker, Utterance>; turns: SpokenTurns };

// What one event does to the call: the events it reports, given what was heard so far.
type Step = (heard: Heard) => VoiceProviderEvent[];

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
  ({ saying }) => {
    const before = saying.get(speaker) ?? { id: item.id, text: '' };
    const now = { id: before.id, text: before.text + item.text };

    saying.set(speaker, now);

    return partial(speaker, now);
  };

type TurnFields = { turn: { id: string; transcript: string } };

const utteranceOf = ({ turn }: TurnFields): Utterance => ({
  id: turn.id,
  text: turn.transcript,
});

const speakerOf = (event: VoiceProviderEvent): Speaker =>
  event.type === 'person.transcript' ? 'person' : 'voice';

// A new turn settles the turns still open; a settled speaker's next words start afresh.
const turnOpened =
  (speaker: Speaker, ...after: VoiceProviderEvent[]) =>
  (fields: TurnFields): Step =>
  ({ saying, turns }) => {
    const settled = turns.opened(speaker, utteranceOf(fields));

    for (const event of settled) saying.delete(speakerOf(event));

    return [...settled, ...after];
  };

const turnGrew =
  ({ turn_id: turnId, delta }: { turn_id: string; delta: string }): Step =>
  ({ turns }) => {
    turns.grew(turnId, delta);

    return [];
  };

// A done turn's transcript is the whole utterance; the speaker's next words start afresh.
const turnDone =
  (speaker: Speaker, ...after: VoiceProviderEvent[]) =>
  (fields: TurnFields): Step =>
  ({ saying, turns }) => {
    saying.delete(speaker);

    return [...turns.done(speaker, utteranceOf(fields)), ...after];
  };

// The service closed the call: the words still being said end first, then the close with the reason it gave.
const closed =
  ({ reason }: { reason?: string }): Step =>
  ({ turns }) => [...turns.closing(), serviceClosed(reason)];

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
    .looseObject({ type: z.literal('turn.created'), ...userTurn })
    .transform(turnOpened('person')),
  z
    .looseObject({ type: z.literal('turn.created'), ...assistantTurn })
    .transform(turnOpened('voice', { type: 'speaking', speaking: true })),
  z
    .looseObject({
      type: z.literal('turn.delta'),
      turn_id: z.string(),
      delta: z.string(),
    })
    .transform(turnGrew),
  z
    .looseObject({ type: z.literal('turn.done'), ...userTurn })
    .transform(turnDone('person')),
  z
    .looseObject({ type: z.literal('turn.done'), ...assistantTurn })
    .transform(turnDone('voice', { type: 'speaking', speaking: false })),
  delegation.transform(requested),
  z
    .looseObject({
      type: z.literal('session.closed'),
      reason: z.string().optional(),
    })
    .transform(closed),
]);

const stepOf = (frame: string): Step | null => {
  try {
    const parsed = reported.safeParse(JSON.parse(frame));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

// Reads one call's control-link text frames, keeping what was heard across frames.
export class LinkReader {
  private readonly heard: Heard = {
    saying: new Map(),
    turns: new SpokenTurns(),
  };

  // What one text frame means to the call; nothing for events not reported and for anything unreadable.
  public read(frame: string): VoiceProviderEvent[] {
    return stepOf(frame)?.(this.heard) ?? [];
  }
}

// Only a text frame is an event; audio frames are dropped unread.
export const textOfFrame = (
  data: Buffer | ArrayBuffer | Buffer[],
  isBinary: boolean,
): string => (Buffer.isBuffer(data) && !isBinary ? data.toString('utf8') : '');
