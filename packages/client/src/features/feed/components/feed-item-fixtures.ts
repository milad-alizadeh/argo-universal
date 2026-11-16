import { groupTitle } from '../view/group-title';
import type { FeedItemProps } from './feed-item';
import {
  completedCommand,
  readMocks,
  recordedToolCall,
  toolCallGroupMock,
} from './tool-call.mocks';

const genericCalls = ['mcp-content', 'mcp-raw'].map(recordedToolCall);

const reads = readMocks.map(({ row }) => row);

// Recorded generic calls beside an exploration exercise both activity boundaries.
export const mixedTools = {
  item: {
    ...toolCallGroupMock.group,
    title: groupTitle([...genericCalls, ...reads, completedCommand]),
    items: [
      ...genericCalls.map((row) => ({ type: 'tool_call' as const, row })),
      {
        ...toolCallGroupMock.exploration,
        toolCalls: reads,
      },
      { type: 'tool_call', row: completedCommand },
    ],
  },
  imageUrl: (): string => '',
} satisfies FeedItemProps;
