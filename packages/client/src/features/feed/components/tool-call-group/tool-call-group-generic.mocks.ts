import type { ToolCallUpdate } from '@repo/contracts';
import { recordedReports } from '@repo/mocks/app';
import type { FeedGroup } from '../../view/feed-view';
import { toolCallGroupMock } from '../tool-call.mocks';

export function genericGroup(toolCallId: string): FeedGroup {
  const recorded = recordedReports.parent.find(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  );

  if (!recorded)
    throw new Error('Scripted recording needs a generic Tool call');
  const row = recorded;

  return {
    ...toolCallGroupMock.running,
    state: 'open',
    live: { toolCall: row, awaitingApproval: false },
    items: [{ type: 'tool_call', row, awaitingApproval: false }],
  };
}
