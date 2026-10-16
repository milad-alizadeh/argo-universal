import type { Notice, SessionUpdate, TurnEnd } from '@repo/contracts';
import type { FeedTurnEnd } from './feed-view';

const readEnd = (row: Notice): TurnEnd | undefined => row._meta?.argo?.turnEnd;

const noticeEnd = (row: Notice): FeedTurnEnd | undefined => {
  const end = readEnd(row);

  return end ? { type: 'turn_end', row, end } : undefined;
};

export const turnEndItem = (row: SessionUpdate): FeedTurnEnd | undefined =>
  row.sessionUpdate === 'notice' ? noticeEnd(row) : undefined;
