import type * as React from 'react';
import type { FeedViewItem } from '../view/feed-view';
import type { FeedItemProps } from './feed-item';
import { FeedNotice } from './feed-notice/feed-notice';
import { renderMessageSlot } from './replaceable-feed-item';
import { UserMessage } from './user-message/user-message';

type FeedRowItem = Extract<FeedViewItem, { type: 'row' }>['row'];

type Drawing = Omit<FeedItemProps, 'item'>;

function noticeRow(
  row: Exclude<
    FeedRowItem,
    { sessionUpdate: 'user_message' | 'agent_message' }
  >,
): React.JSX.Element | null {
  return row.sessionUpdate === 'notice' ||
    row.sessionUpdate === 'compaction_update' ? (
    <FeedNotice row={row} />
  ) : null;
}

export function renderRow(
  row: FeedRowItem,
  drawing: Drawing,
): React.JSX.Element | null {
  if (row.sessionUpdate === 'prompt_message')
    return <UserMessage row={row} imageUrl={drawing.imageUrl} />;

  return renderStandardRow(row, drawing);
}

function renderStandardRow(
  row: Exclude<FeedRowItem, { sessionUpdate: 'prompt_message' }>,
  drawing: Drawing,
): React.JSX.Element | null {
  if (
    row.sessionUpdate !== 'user_message' &&
    row.sessionUpdate !== 'agent_message'
  )
    return noticeRow(row);

  return renderMessageSlot(row, drawing);
}
