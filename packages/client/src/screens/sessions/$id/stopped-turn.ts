import type { ContentBlock } from '@repo/contracts';
import type { FeedViewItem } from '#features/feed';

type TurnEnding = Extract<FeedViewItem, { type: 'turn_end' }>;

export interface StoppedTurn {
  ending: TurnEnding;
  prompt: ContentBlock[];
}

const promptOf = (item: FeedViewItem): ContentBlock[] =>
  item.type === 'row' && item.row.sessionUpdate === 'user_message'
    ? item.row.content
    : [];

const isPrompt = (item: FeedViewItem): boolean => promptOf(item).length > 0;

const isTurnEdge = (item: FeedViewItem): boolean =>
  item.type === 'turn_end' || isPrompt(item);

const isErrorEnding = (item?: FeedViewItem): item is TurnEnding =>
  item?.type === 'turn_end' && item.end.stopReason === 'error';

function withPrompt(
  ending: TurnEnding,
  earlier: readonly FeedViewItem[],
): StoppedTurn | undefined {
  const message = earlier.findLast(isPrompt);

  return message && { ending, prompt: promptOf(message) };
}

// The Feed's last Turn when it ended in an error, with the prompt that began it. A prompt on an older page leaves nothing to retry.
export function stoppedTurn(
  items: readonly FeedViewItem[],
): StoppedTurn | undefined {
  const at = items.findLastIndex(isTurnEdge);
  const ending = items[at];

  return isErrorEnding(ending)
    ? withPrompt(ending, items.slice(0, at))
    : undefined;
}
