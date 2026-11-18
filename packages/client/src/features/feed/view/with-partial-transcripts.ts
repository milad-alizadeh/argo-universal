import type { VoicePartial } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';

type PartialRow = Extract<FeedViewItem, { type: 'row' }>;

// One key per speaker, so a growing partial stays one row and never collides with the stored row it becomes.
const partialId = (speaker: VoicePartial['speaker']): string =>
  `partial:${speaker}`;

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

const partialItem = (
  { speaker, text }: VoicePartial,
  sessionId: string,
): PartialRow => ({
  type: 'row',
  partial: true,
  row: {
    ...envelope,
    id: partialId(speaker),
    messageId: partialId(speaker),
    sessionId,
    sessionUpdate: kinds[speaker],
    content: [{ type: 'text', text }],
  },
});

// The Feed with the words being said on a Voice call drawn last, in place at its tail. They are live state of the call, never stored rows.
export function withPartialTranscripts(
  items: FeedViewItem[],
  partials: readonly VoicePartial[],
  sessionId: string,
): FeedViewItem[] {
  if (partials.length === 0) return items;

  return [...items, ...partials.map((p) => partialItem(p, sessionId))];
}
