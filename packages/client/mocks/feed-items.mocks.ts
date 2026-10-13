import type {
  FeedActivity,
  FeedExploration,
  FeedGroup,
  FeedViewItem,
} from '../src/features/feed/view/feed-view';

export function requireGroup(item: FeedViewItem | undefined): FeedGroup {
  if (!item) throw new Error('Recording needs an item');

  if (item.type !== 'group') throw new Error('Recording needs a group');

  return item;
}

export function requireCollapsible(
  item: FeedViewItem | undefined,
): FeedGroup | FeedExploration {
  if (!item) throw new Error('Recording needs an item');

  return collapsible(item);
}

function collapsible(item: FeedViewItem): FeedGroup | FeedExploration {
  if (item.type === 'group') return item;

  if (item.type === 'exploration') return item;
  throw new Error('Recording needs a group or exploration');
}

export function changedActivity(
  item: FeedActivity | undefined,
): Extract<FeedActivity, { type: 'tool_call' | 'exploration' }> {
  if (!item) throw new Error('Group needs an activity');

  return toolActivity(item);
}

function toolActivity(
  item: FeedActivity,
): Extract<FeedActivity, { type: 'tool_call' | 'exploration' }> {
  if (item.type === 'tool_call') return item;

  if (item.type === 'exploration') return item;
  throw new Error('Group needs a tool call');
}
