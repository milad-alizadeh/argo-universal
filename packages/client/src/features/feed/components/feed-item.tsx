import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { memo, Fragment } from 'react';
import { toolCallFacts } from '../view/feed-row-facts';
import {
  explorationTitle,
  type FeedActivity,
  type FeedGroup,
  type FeedViewItem,
} from '../view/feed-view';
import { CommandRow } from './command-row/command-row';
import { EditRow } from './edit-row/edit-row';
import { FeedImageUrlContext } from './feed-image';
import { FeedNotice } from './feed-notice/feed-notice';
import { renderToolCallSlot, renderMessageSlot } from './replaceable-feed-item';
import { SubagentRow } from './subagent-row/subagent-row';
import { ToolCallGroup } from './tool-call-group/tool-call-group';
import { ToolCallRow } from './tool-call-row/tool-call-row';
import { TurnEndRow } from './turn-end/turn-end';
import { UserMessage } from './user-message/user-message';

export interface FeedItemProps {
  item: FeedViewItem;
  imageUrl: (blob: BlobRef) => string;
  // Opens a Subagent row's Feed, where the Session offers one.
  onOpenSubagent?: (subagentSessionId: string) => void;
}

type ToolCallActivity = Extract<
  FeedActivity,
  { type: 'tool_call' | 'thought' }
>;

type ToolCall = Extract<FeedActivity, { type: 'tool_call' }>['row'];

const hasContent = (row: ToolCall, type: string): boolean =>
  row.content.some((block) => block.type === type);

const isCommand = (row: ToolCall): boolean =>
  toolCallFacts(row).isCommand && hasContent(row, 'terminal');

const isEdit = (row: ToolCall): boolean =>
  toolCallFacts(row).isEdit && hasContent(row, 'diff');

function coreToolCallRow(row: ToolCall): React.JSX.Element {
  if (isCommand(row)) return <CommandRow row={row} />;

  return isEdit(row) ? <EditRow row={row} /> : <ToolCallRow row={row} />;
}

const toolCallRow = (row: ToolCall): React.JSX.Element =>
  renderToolCallSlot(row, coreToolCallRow);

const explorationRow = (row: ToolCall): React.JSX.Element => (
  <ToolCallRow row={row} />
);

// Thoughts draw nothing in the Feed.
const toolCallActivityRow = (
  activity: ToolCallActivity,
): React.JSX.Element | null =>
  activity.type === 'tool_call' ? toolCallRow(activity.row) : null;

const FeedActivityRow = memo(function FeedActivityRow({
  activity,
}: {
  activity: FeedActivity;
}) {
  if (activity.type === 'exploration')
    return explorationRows(activity.toolCalls);

  return activity.type === 'row' ? (
    <FeedNotice row={activity.row} />
  ) : (
    toolCallActivityRow(activity)
  );
});

const renderActivity = (activity: FeedActivity): React.JSX.Element => (
  <FeedActivityRow activity={activity} />
);

// One item of the Feed view, drawn by the row component for its kind.
export const FeedItem = memo(function FeedItem({
  item,
  imageUrl,
  onOpenSubagent,
}: FeedItemProps) {
  return (
    <FeedImageUrlContext.Provider value={imageUrl}>
      {item.type === 'turn_end' ? (
        <TurnEndRow end={item.end} />
      ) : (
        renderFeedItem(item, { imageUrl, onOpenSubagent })
      )}
    </FeedImageUrlContext.Provider>
  );
});

type GroupLike = Extract<FeedViewItem, { type: 'group' | 'exploration' }>;

type FeedRowItem = Extract<FeedViewItem, { type: 'row' }>['row'];

type Drawing = Pick<FeedItemProps, 'imageUrl' | 'onOpenSubagent'>;

const isGroupLike = (item: FeedViewItem): item is GroupLike =>
  item.type === 'group' || item.type === 'exploration';

// An exploration draws as a group of its own.
const groupOf = (item: GroupLike): FeedGroup =>
  item.type === 'group'
    ? item
    : {
        type: 'group',
        id: item.id,
        title: explorationTitle(item.state),
        state: item.state,
        items: [item],
      };

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

function renderRow(
  row: FeedRowItem,
  imageUrl: FeedItemProps['imageUrl'],
): React.JSX.Element | null {
  if (row.sessionUpdate === 'prompt_message')
    return <UserMessage row={row} imageUrl={imageUrl} />;

  return renderStandardRow(row, imageUrl);
}

function renderStandardRow(
  row: Exclude<FeedRowItem, { sessionUpdate: 'prompt_message' }>,
  imageUrl: FeedItemProps['imageUrl'],
): React.JSX.Element | null {
  if (
    row.sessionUpdate !== 'user_message' &&
    row.sessionUpdate !== 'agent_message'
  )
    return noticeRow(row);

  return renderMessageSlot(row, imageUrl);
}

function renderFeedItem(
  item: Exclude<FeedViewItem, { type: 'turn_end' }>,
  drawing: Drawing,
): React.JSX.Element | null {
  if (item.type === 'row') return renderRow(item.row, drawing.imageUrl);

  if (item.type === 'subagent')
    return <SubagentRow item={item} onOpen={drawing.onOpenSubagent} />;

  return renderActivityItem(item);
}

function explorationRows(rows: ToolCall[]): React.JSX.Element[] {
  return rows.map((row) => (
    <Fragment key={row.id}>{renderToolCallSlot(row, explorationRow)}</Fragment>
  ));
}

function renderActivityItem(
  item: Exclude<FeedViewItem, { type: 'turn_end' | 'row' | 'subagent' }>,
): React.JSX.Element {
  return isGroupLike(item) ? (
    <ToolCallGroup group={groupOf(item)} renderActivity={renderActivity} />
  ) : (
    <FeedActivityRow activity={item} />
  );
}
