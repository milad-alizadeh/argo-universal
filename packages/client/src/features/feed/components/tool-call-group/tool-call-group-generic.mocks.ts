import type { ToolCallUpdate } from '@repo/contracts';
import { recordedReports } from '@repo/mocks/app';
import type { FeedGroup } from '../../view/feed-view';
import { toolCallGroupMock } from '../tool-call.mocks';

export function recordedToolCall(toolCallId: string): ToolCallUpdate {
  const recorded = recordedReports.parent.find(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  );

  if (!recorded)
    throw new Error('Scripted recording needs a generic Tool call');

  return recorded;
}

// An open group of the given calls, the last of them live.
export function genericGroup(
  ...toolCallIds: [...string[], string]
): FeedGroup {
  const rows = toolCallIds.map(recordedToolCall);
  const live = recordedToolCall(toolCallIds[toolCallIds.length - 1] ?? '');

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
