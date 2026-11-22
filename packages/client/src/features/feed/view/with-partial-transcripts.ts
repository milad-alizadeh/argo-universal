import type { ConversationPartial } from '@repo/contracts';
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
  { speaker, id, rowId, text }: ConversationPartial,
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

// The Feed with the words being said on a Conversation drawn last, in place at its tail. They are live state of the call, never stored rows; one whose final row the Feed already holds is that row.
export function withPartialTranscripts(
  items: FeedViewItem[],
  partials: readonly ConversationPartial[],
  sessionId: string,
): readonly FeedViewItem[] {
  return appendPartialTranscripts(
    items,
    partials.map((partial) => partialItem(partial, sessionId)),
  );
}

export function appendPartialTranscripts(
  stored: readonly FeedViewItem[],
  rows: readonly PartialRow[],
  storedKeys?: ReadonlySet<string>,
): readonly FeedViewItem[] {
  if (!rows.length) return stored;

  const keys = storedKeys ?? new Set(stored.map(feedItemKey));
  const saying = rows.filter(({ row }) => !keys.has(row.id));

  return saying.length ? [...stored, ...saying] : stored;
}

export interface PartialTranscript {
  partial: ConversationPartial;
  row: PartialRow;
}

function samePartial(
  first: ConversationPartial,
  second: ConversationPartial,
): boolean {
  return (
    first.rowId === second.rowId &&
    first.id === second.id &&
    first.speaker === second.speaker &&
    first.text === second.text
  );
}

export function projectPartialTranscripts(
  partials: readonly ConversationPartial[],
  sessionId: string,
  previous: readonly PartialTranscript[],
): readonly PartialTranscript[] {
  const byId = new Map(previous.map((item) => [item.partial.rowId, item]));

  const rows = partials.map((partial) => {
    const prior = byId.get(partial.rowId);

    return prior && samePartial(partial, prior.partial)
      ? prior
      : { partial, row: partialItem(partial, sessionId) };
  });

  return rows.length === previous.length &&
    rows.every((row, index) => row === previous[index])
    ? previous
    : rows;
}
