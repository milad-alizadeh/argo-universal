import type { ToolCallUpdate } from '@repo/contracts';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';
import { recordedToolCall, toolCallGroupMock } from '../tool-call.mocks';

const toolCallActivity = (row: ToolCallUpdate): FeedActivity => ({
  type: 'tool_call',
  row,
  awaitingApproval: false,
});

// An open group whose live Tool call comes after any earlier calls.
export function genericGroup(
  liveId: string,
  ...earlierIds: string[]
): FeedGroup {
  const live = recordedToolCall(liveId);
  const rows = [...earlierIds.map(recordedToolCall), live];

  return {
    ...toolCallGroupMock.running,
    state: 'open',
    live: { toolCall: live, awaitingApproval: false },
    items: rows.map(toolCallActivity),
  };
}
