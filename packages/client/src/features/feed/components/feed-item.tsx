import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { memo } from 'react';
import type { FeedActivity, FeedGroup, FeedViewItem } from '../view/feed-view';
import { AgentMessage } from './agent-message/agent-message';
import { CommandRow } from './command-row/command-row';
import { EditRow } from './edit-row/edit-row';
import { FeedImageUrlContext } from './feed-image';
import { FeedNotice } from './feed-notice/feed-notice';
import { ToolCallGroup } from './tool-call-group/tool-call-group';
import { ToolCallRow } from './tool-call-row/tool-call-row';
import { UserMessage } from './user-message/user-message';

export interface FeedItemProps {
  item: FeedViewItem;
  imageUrl: (blob: BlobRef) => string;
}

type ToolCallActivity = Extract<
  FeedActivity,
  { type: 'tool_call' | 'thought' }
>;
type ToolCall = Extract<FeedActivity, { type: 'tool_call' }>['row'];

const hasContent = (row: ToolCall, type: string): boolean =>
  row.content.some((block) => block.type === type);

const isCommand = (row: ToolCall): boolean =>
  row.kind === 'execute' && hasContent(row, 'terminal');

const isEdit = (row: ToolCall): boolean =>
  ['edit', 'delete', 'move'].includes(row.kind) && hasContent(row, 'diff');

function toolCallRow(row: ToolCall): React.JSX.Element {
  if (isCommand(row)) return <CommandRow row={row} />;
  return isEdit(row) ? <EditRow row={row} /> : <ToolCallRow row={row} />;
}

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
    return activity.toolCalls.map((row) => (
      <ToolCallRow key={row.id} row={row} />
    ));
  return activity.type === 'row' ? (
    <FeedNotice row={activity.row} />
  ) : (
    toolCallActivityRow(activity)
  );
});

const renderActivity = (activity: FeedActivity): React.JSX.Element => (
  <FeedActivityRow activity={activity} />
);

// Items the Feed draws whatever they hold; a row draws when `drawnRows` holds its update.
const drawnItemTypes: Record<Exclude<FeedViewItem['type'], 'row'>, boolean> = {
  group: true,
  exploration: true,
  tool_call: true,
  thought: false,
};

const drawnRows = new Set<string>([
  'user_message',
  'agent_message',
  'notice',
  'compaction_update',
]);

// Whether the Feed draws anything for an item yet.
export function isDrawnFeedItem(item: FeedViewItem): boolean {
  if (item.type === 'row') return drawnRows.has(item.row.sessionUpdate);
  return drawnItemTypes[item.type];
}

// One item of the Feed view, drawn by the row component for its kind.
export const FeedItem = memo(function FeedItem({
  item,
  imageUrl,
}: FeedItemProps) {
  return (
    <FeedImageUrlContext.Provider value={imageUrl}>
      {renderFeedItem(item, imageUrl)}
    </FeedImageUrlContext.Provider>
  );
});

type GroupLike = Extract<FeedViewItem, { type: 'group' | 'exploration' }>;
type FeedRowItem = Extract<FeedViewItem, { type: 'row' }>['row'];
type ImageUrl = FeedItemProps['imageUrl'];

const isGroupLike = (item: FeedViewItem): item is GroupLike =>
  item.type === 'group' || item.type === 'exploration';

// An exploration draws as a group of its own.
const groupOf = (item: GroupLike): FeedGroup =>
  item.type === 'group'
    ? item
    : {
        type: 'group',
        id: item.id,
        title: item.title,
        state: item.title === 'Exploring' ? 'open' : 'settled',
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
  imageUrl: ImageUrl,
): React.JSX.Element | null {
  if (row.sessionUpdate === 'user_message')
    return <UserMessage row={row} imageUrl={imageUrl} />;
  return row.sessionUpdate === 'agent_message' ? (
    <AgentMessage row={row} />
  ) : (
    noticeRow(row)
  );
}

function renderFeedItem(
  item: FeedViewItem,
  imageUrl: ImageUrl,
): React.JSX.Element | null {
  if (item.type === 'row') return renderRow(item.row, imageUrl);
  return isGroupLike(item) ? (
    <ToolCallGroup group={groupOf(item)} renderActivity={renderActivity} />
  ) : (
    <FeedActivityRow activity={item} />
  );
}
