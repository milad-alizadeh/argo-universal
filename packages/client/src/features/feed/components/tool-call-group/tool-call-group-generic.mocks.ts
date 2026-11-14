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

export function genericHeaderGroup(
  liveId: string,
  ...earlierIds: string[]
): FeedGroup {
  const group = genericGroup(liveId, ...earlierIds);
  const row = recordedToolCall(liveId);

  return {
    ...group,
    liveHeader: {
      text: row.title,
      source: { type: 'tool_call', toolCallId: row.toolCallId },
      startedAt: null,
    },
  };
}
