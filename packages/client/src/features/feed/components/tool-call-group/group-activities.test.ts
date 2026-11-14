import { expect, it } from 'vitest';
import type { FeedGroup } from '../../view/feed-view';
import { runningRead } from '../tool-call.mocks';
import {
  liveHeaderOf,
  liveToolCall,
  titledLiveCall,
  visibleActivities,
} from './group-activities';
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

const describedRead: FeedGroup = {
  type: 'group',
  id: runningRead.id,
  title: 'Read 1 file',
  state: 'open',
  live: { toolCall: runningRead, awaitingApproval: false },
  liveHeader: {
    text: 'Inspecting the greeting',
    source: { type: 'tool_call', toolCallId: runningRead.toolCallId },
    startedAt: null,
  },
  items: [
    {
      type: 'exploration',
      id: runningRead.id,
      state: 'open',
      toolCalls: [runningRead],
    },
  ],
};

it('keeps a read disclosure when the live header adds a different description', () => {
  expect(titledLiveCall(describedRead)).toBeUndefined();
  expect(visibleActivities(describedRead)).toEqual(describedRead.items);
});
