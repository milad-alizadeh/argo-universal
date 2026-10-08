import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { memo } from 'react';
import type { FeedActivity, FeedViewItem } from '../feed/feed-view';
import { AgentMessage } from './agent-message';
import { CommandRow } from './command-row';
import { EditRow } from './edit-row';
import { ToolCallGroup } from './tool-call-group';
import { ToolCallRow } from './tool-call-row';
import { UserMessage } from './user-message';

export interface FeedItemProps {
  item: FeedViewItem;
  imageUrl: (blob: BlobRef) => string;
}

// Thoughts, Notices, Compaction and Turn ends get their rows in #148.
const FeedActivityRow = memo(function FeedActivityRow({
  activity,
}: {
  activity: FeedActivity;
}) {
  if (activity.type === 'exploration')
    return activity.toolCalls.map((row) => (
      <ToolCallRow key={row.id} row={row} />
    ));
  if (activity.type !== 'tool_call') return null;
  const { row } = activity;
  if (row.kind === 'execute') return <CommandRow row={row} />;
  if (row.kind === 'edit' || row.kind === 'delete' || row.kind === 'move')
    return <EditRow row={row} />;
  return <ToolCallRow row={row} />;
});

const renderActivity = (activity: FeedActivity): React.JSX.Element => (
  <FeedActivityRow activity={activity} />
);

// Whether the Feed draws anything for an item yet.
export function isDrawnFeedItem(item: FeedViewItem): boolean {
  switch (item.type) {
    case 'group':
    case 'exploration':
    case 'tool_call':
      return true;
    case 'thought':
      return false;
    case 'row':
      return (
        item.row.sessionUpdate === 'user_message' ||
        item.row.sessionUpdate === 'agent_message'
      );
  }
}

// One item of the Feed view, drawn by the row component for its kind.
export const FeedItem = memo(function FeedItem({
  item,
  imageUrl,
}: FeedItemProps) {
  if (item.type === 'group')
    return <ToolCallGroup group={item} renderActivity={renderActivity} />;
  if (item.type === 'exploration')
    return (
      <ToolCallGroup
        group={{
          type: 'group',
          id: item.id,
          title: item.title,
          state: item.title === 'Exploring' ? 'open' : 'settled',
          items: [item],
        }}
        renderActivity={renderActivity}
      />
    );
  if (item.type !== 'row') return <FeedActivityRow activity={item} />;
  const { row } = item;
  if (row.sessionUpdate === 'user_message')
    return <UserMessage row={row} imageUrl={imageUrl} />;
  if (row.sessionUpdate === 'agent_message') return <AgentMessage row={row} />;
  return null;
});
