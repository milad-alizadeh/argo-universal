import type { FeedUpdate, VoicePartial, VoiceSpeaker } from '@repo/contracts';
import type { AnyActorRef } from 'xstate';
import type { FeedEvent } from '../feed';
import { sessionActorId } from '../sessions';
import type { VoiceProviderEvent } from './provider';

export type TranscriptEvent = Extract<
  VoiceProviderEvent,
  { type: 'person.transcript' | 'voice.transcript' }
>;

export const isTranscript = (
  event: VoiceProviderEvent,
): event is TranscriptEvent =>
  event.type === 'person.transcript' || event.type === 'voice.transcript';

const speakerOf = (event: TranscriptEvent): VoiceSpeaker =>
  event.type === 'person.transcript' ? 'person' : 'voice';

const kinds = {
  person: 'person_transcript',
  voice: 'voice_transcript',
} as const satisfies Record<VoiceSpeaker, FeedUpdate['sessionUpdate']>;

// The Feed row a transcript's final words are stored as; its partials carry the same id, so the App draws them as one row.
const rowIdOf = (callId: string, event: TranscriptEvent): string =>
  `${callId}:${speakerOf(event)}:${event.id}`;

// What is being said now, one entry per speaker: a partial replaces its speaker's, a final clears it.
export function withTranscript(
  partials: VoicePartial[],
  call: { callId: string },
  event: TranscriptEvent,
): VoicePartial[] {
  const speaker = speakerOf(event);
  const others = partials.filter((partial) => partial.speaker !== speaker);

  if (event.final) return others;
  const { id, text } = event;
  const rowId = rowIdOf(call.callId, event);

  return [...others, { speaker, id, rowId, text }].toSorted((a, b) =>
    a.speaker.localeCompare(b.speaker),
  );
}

// A final transcript as the Feed row it is stored as. Rows land in the order the Feed actor receives them, so they interleave with the Turn's rows as spoken.
const transcriptUpdate = (
  callId: string,
  event: TranscriptEvent,
): FeedUpdate => ({
  id: rowIdOf(callId, event),
  sessionUpdate: kinds[speakerOf(event)],
  messageId: event.id,
  state: 'settled',
  content: [{ type: 'text', text: event.text }],
});

const transcriptRow = (callId: string, event: TranscriptEvent): FeedEvent => ({
  type: 'feed.change',
  turnId: null,
  blobs: [],
  change: { type: 'upsert', update: transcriptUpdate(callId, event) },
});

interface ActorLookup {
  get: (systemId: string) => AnyActorRef | undefined;
}

const feedOf = (
  system: ActorLookup,
  sessionId: string,
): { send: (event: FeedEvent) => void } | undefined =>
  system.get(sessionActorId(sessionId))?.getSnapshot().children.feed;

// Stores a final transcript in the Session's Feed; words still changing are live state and store nothing. A Session that is gone keeps nothing.
export function storeTranscript(
  system: ActorLookup,
  call: { callId: string; sessionId: string },
  event: TranscriptEvent,
): void {
  if (event.final)
    feedOf(system, call.sessionId)?.send(transcriptRow(call.callId, event));
}
