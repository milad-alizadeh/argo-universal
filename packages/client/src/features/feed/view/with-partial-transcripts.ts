import type { VoicePartial } from '@repo/contracts';
import { feedItemKey, type FeedViewItem } from './feed-view';

type PartialRow = Extract<FeedViewItem, { type: 'row' }>;

const envelope = {
  // Drawn after every stored row.
  position: Number.MAX_SAFE_INTEGER,
  revision: 0,
  turnId: null,
  state: 'open',
} as const;

const kinds = {
  person: 'person_transcript',
  voice: 'voice_transcript',
} as const;

// A partial is keyed as the row its final words are stored as, so it grows in place and, once final, that row draws on in the same place: nothing mounts again, and nothing fades twice.
const partialItem = (
  { speaker, id, rowId, text }: VoicePartial,
  sessionId: string,
): PartialRow => ({
  type: 'row',
  partial: true,
  row: {
    ...envelope,
    id: rowId,
    messageId: id,
    sessionId,
    sessionUpdate: kinds[speaker],
    content: [{ type: 'text', text }],
  },
});

// The Feed with the words being said on a Voice call drawn last, in place at its tail. They are live state of the call, never stored rows; one whose final row the Feed already holds is that row.
export function withPartialTranscripts(
  items: FeedViewItem[],
  partials: readonly VoicePartial[],
  sessionId: string,
): FeedViewItem[] {
  if (partials.length === 0) return items;

  const stored = new Set(items.map(feedItemKey));
  const saying = partials.filter((partial) => !stored.has(partial.rowId));

  return [...items, ...saying.map((p) => partialItem(p, sessionId))];
}
