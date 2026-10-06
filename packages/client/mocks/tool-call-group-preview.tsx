import { CommandRow } from '../src/components/CommandRow';
import { ExploredRow } from '../src/components/ExploredRow';
import type { FeedActivity } from '../src/feed/feed-view';

export function renderRecordedActivity(activity: FeedActivity) {
  if (activity.type === 'exploration')
    return <ExploredRow exploration={activity} />;
  if (activity.type === 'tool_call') return <CommandRow row={activity.row} />;
  throw new Error('This recording needs only commands and exploration');
}
