import { expect, it } from 'vitest';
import { liveHeaderOf, liveToolCall } from './group-activities';
import { awaitingApprovalGroup } from './tool-call-group-fixtures';

const { group } = awaitingApprovalGroup;

if (group.state !== 'open' || !group.live?.awaitingApproval)
  throw new Error('Recorded catalog needs a live Tool call awaiting approval');

const withHeader = {
  ...group,
  liveHeader: {
    text: group.live.toolCall.title,
    source: {
      type: 'tool_call' as const,
      toolCallId: group.live.toolCall.toolCallId,
    },
    startedAt: null,
  },
};

it('keeps approval ownership when a Tool call live header is still present', () => {
  expect(liveToolCall(withHeader)?.awaitingApproval).toBe(true);
  expect(liveHeaderOf(withHeader)).toBeUndefined();
});
