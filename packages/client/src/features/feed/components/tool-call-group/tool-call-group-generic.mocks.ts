import type { FeedGroup } from '../../view/feed-view';
import { recordedToolCall, toolCallGroupMock } from '../tool-call.mocks';

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
    items: rows.map((row) => ({
      type: 'tool_call',
      row,
      awaitingApproval: false,
    })),
  };
}
