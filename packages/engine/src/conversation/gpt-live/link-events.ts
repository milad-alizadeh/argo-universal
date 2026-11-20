import { z } from 'zod';
import type { ConversationProviderEvent } from '../provider';
import { usageUpdated } from './link-limit';
import { SpokenTurns, type Speaker, type Utterance } from './link-turns';
import { frameRejections, readFrame } from './read-frame';
import { serviceClosed } from './service-close';

/*
 * The control link's events as the service sends them ("frameless bidi"); Codex reads the same ones (codex-rs realtime_websocket/protocol_frameless_bidi.rs).
 * Words arrive a chunk at a time, both as `*_transcript.added` under each chunk's own item id and as `turn.delta` under the turn's id. Partials are read from the turn,
 * so a partial carries the id its final is stored under; the chunks are not read. A turn's `turn.done` holds its whole transcript, which is what was said.
 * A turn the person cut short is done with what was said up to then; one that ends without a transcript keeps the words heard in it (`link-turns.ts`).
 * `session.usage.updated` counts audio time, not tokens, so only its allowance is reported: a status there is a limit.
 */

// What one event does to the call: the events it reports, given the turns still open.
type Step = (turns: SpokenTurns) => ConversationProviderEvent[];

const report =
  (...events: ConversationProviderEvent[]): Step =>
  () =>
    events;

type TurnFields = { turn: { id: string; transcript: string } };

const utteranceOf = ({ turn }: TurnFields): Utterance => ({
  id: turn.id,
  text: turn.transcript,
});

// A new turn settles the turns still open, and shows its own words so far.
const turnOpened =
  (speaker: Speaker, ...after: ConversationProviderEvent[]) =>
  (fields: TurnFields): Step =>
  (turns) => [...turns.opened(speaker, utteranceOf(fields)), ...after];

const turnGrew =
  ({ turn_id: turnId, delta }: { turn_id: string; delta: string }): Step =>
  (turns) =>
    turns.grew(turnId, delta);

// A done turn's transcript is the whole utterance.
const turnDone =
  (speaker: Speaker, ...after: ConversationProviderEvent[]) =>
  (fields: TurnFields): Step =>
  (turns) => [...turns.done(speaker, utteranceOf(fields)), ...after];

// The service closed the call: the words still being said end first, then the close with the reason it gave.
const closed =
  ({ reason }: { reason?: string }): Step =>
  (turns) => [...turns.closing(), serviceClosed(reason)];

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
  usageUpdated.transform((limits) => report(...limits)),
  z
    .looseObject({
      type: z.literal('session.closed'),
      reason: z.string().optional(),
    })
    .transform(closed),
]);

const rejectFrame = frameRejections('GPT-Live control link');

// Reads one call's control-link text frames, keeping the turns still open across frames.
export class LinkReader {
  private readonly turns = new SpokenTurns();

  // What one text frame means to the call; nothing for events not reported, and for anything unreadable, which is reported.
  public read(frame: string): ConversationProviderEvent[] {
    return readFrame(reported, frame, rejectFrame)?.(this.turns) ?? [];
  }

  // The call ending here: every open turn keeps the words said so far.
  public closing(): ConversationProviderEvent[] {
    return this.turns.closing();
  }
}

// Only a text frame is an event; audio frames are dropped unread.
export const textOfFrame = (
  data: Buffer | ArrayBuffer | Buffer[],
  isBinary: boolean,
): string => (Buffer.isBuffer(data) && !isBinary ? data.toString('utf8') : '');
