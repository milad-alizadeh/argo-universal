import type { SessionUpdate } from '@repo/contracts';
import { noticeTurnEnd } from './feed-row-facts';
import type { FeedTurnEnd } from './feed-view';

export function turnEndItem(row: SessionUpdate): FeedTurnEnd | undefined {
  if (row.sessionUpdate !== 'notice') return undefined;
  const end = noticeTurnEnd(row);

  return end ? { type: 'turn_end', row, end } : undefined;
}
