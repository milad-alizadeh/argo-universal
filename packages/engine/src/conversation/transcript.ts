import type {
  FeedUpdate,
  ConversationPartial,
  VoiceSpeaker,
} from '@repo/contracts';
import type { AnyActorRef } from 'xstate';
import type { FeedEvent } from '../feed';
import { sessionActorId } from '../sessions';
import type { ConversationProviderEvent } from './provider';

export type TranscriptEvent = Extract<
  ConversationProviderEvent,
  { type: 'person.transcript' | 'voice.transcript' }
>;

export const isTranscript = (
  event: ConversationProviderEvent,
): event is TranscriptEvent =>
  event.type === 'person.transcript' || event.type === 'voice.transcript';

const speakerOf = (event: TranscriptEvent): VoiceSpeaker =>
  event.type === 'person.transcript' ? 'person' : 'voice';

const kinds = {
  person: 'person_transcript',
  voice: 'voice_transcript',
} as const satisfies Record<VoiceSpeaker, FeedUpdate['sessionUpdate']>;

// The Feed row a transcript's final words are stored as; its partials carry the same id, so the App draws them as one row.
const rowIdOf = (conversationId: string, event: TranscriptEvent): string =>
  `${conversationId}:${speakerOf(event)}:${event.id}`;

// What is being said now, one entry per speaker: a partial replaces its speaker's, a final clears it. A read-out is never drawn.
export function withTranscript(
  partials: ConversationPartial[],
  call: { conversationId: string; readOut: ReadOut | null },
  event: TranscriptEvent,
): ConversationPartial[] {
  const speaker = speakerOf(event);
  const others = partials.filter((partial) => partial.speaker !== speaker);

  if (event.final)
    return partials.filter(
      (partial) => partial.speaker !== speaker || partial.id !== event.id,
    );

  if (isReadOut(call.readOut, event)) return others;
  const { id, text } = event;
  const rowId = rowIdOf(call.conversationId, event);

  return [...others, { speaker, id, rowId, text }].toSorted((a, b) =>
    a.speaker.localeCompare(b.speaker),
  );
}

// A final transcript as the Feed row it is stored as. Rows land in the order the Feed actor receives them, so they interleave with the Turn's rows as spoken.
const transcriptUpdate = (
  conversationId: string,
  event: TranscriptEvent,
): FeedUpdate => ({
  id: rowIdOf(conversationId, event),
  sessionUpdate: kinds[speakerOf(event)],
  messageId: event.id,
  state: 'settled',
  content: [{ type: 'text', text: event.text }],
});

const transcriptRow = (
  conversationId: string,
  event: TranscriptEvent,
): Extract<FeedEvent, { type: 'feed.change' }> => ({
  type: 'feed.change',
  turnId: null,
  blobs: [],
  change: { type: 'upsert', update: transcriptUpdate(conversationId, event) },
});

interface ActorLookup {
  get: (systemId: string) => AnyActorRef | undefined;
}

const feedOf = (
  system: ActorLookup,
  sessionId: string,
): AnyActorRef | undefined =>
  system.get(sessionActorId(sessionId))?.getSnapshot().children.feed;

/*
 * The voice reading an Agent's result aloud (ADR-0064), from the hand-over until the person speaks again. The Agent's
 * answer is the record and the read-out only says it again, so its words are neither stored nor drawn. The voice turn
 * already under way at the hand-over, such as the filler line, is the voice's own and is kept.
 */
export type ReadOut = { spared: string | null };

// The read-out that starts when the relay hands the voice a result; a result handed over during one continues it.
export const readOutFrom = (
  readOut: ReadOut | null,
  partials: readonly ConversationPartial[],
): ReadOut => readOut ?? { spared: voiceSaying(partials) };

// The id of the voice's words still being said, if any.
const voiceSaying = (partials: readonly ConversationPartial[]): string | null =>
  partials.find(({ speaker }) => speaker === 'voice')?.id ?? null;

// The person speaking ends the read-out.
export const readOutAfter = (
  readOut: ReadOut | null,
  event: TranscriptEvent,
): ReadOut | null => (speakerOf(event) === 'person' ? null : readOut);

const isReadOut = (readOut: ReadOut | null, event: TranscriptEvent): boolean =>
  readOut !== null &&
  speakerOf(event) === 'voice' &&
  event.id !== readOut.spared;

// A running call as its transcript is kept: where it is stored, and whether the voice is reading out a result.
export type HearingCall = {
  conversationId: string;
  sessionId: string;
  readOut: ReadOut | null;
  log: (line: string) => void;
};

// Final words are kept; words still changing are live state, and a read-out is never kept.
const kept = (call: HearingCall, event: TranscriptEvent): boolean =>
  event.final && !isReadOut(call.readOut, event);

// Stores a final transcript in the Session's Feed, unless it is a read-out. A Session that is gone keeps nothing.
export function storeTranscript(
  system: ActorLookup,
  call: HearingCall,
  event: TranscriptEvent,
): void {
  if (!kept(call, event)) return;

  const rowId = rowIdOf(call.conversationId, event);

  const rejected = (cause: unknown): void =>
    call.log(
      `could not write transcript ${rowId} in Session ${call.sessionId}: ${String(cause)}`,
    );

  const feed = feedOf(system, call.sessionId);

  if (feed?.getSnapshot().status !== 'active')
    return rejected('Feed unavailable');

  const change: FeedEvent = {
    ...transcriptRow(call.conversationId, event),
    committed: { resolve: () => {}, reject: rejected, waitForRetry: true },
  };

  feed.send(change);
}
