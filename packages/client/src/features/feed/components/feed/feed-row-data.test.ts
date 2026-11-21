import type { AgentMessage } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { workingHeader } from '../live-header/live-header.mocks';
import {
  androidRowType,
  emptyMessageSize,
  type FeedRowData,
  rowKey,
} from './feed-row-data';

const answer = recordedAgentMessage('agent-1', 'markdown-answer');

function streamingRow(content: AgentMessage['content']): FeedRowData {
  return {
    entry: { type: 'row', row: { ...answer, state: 'open', content } },
    spaceBelow: '',
    streaming: true,
  };
}

it('only supplies a height until the first token of the streaming answer arrives', () => {
  const empty = streamingRow([{ type: 'text', text: '' }]);
  expect(emptyMessageSize(empty)).toBe(0);
  expect(emptyMessageSize(streamingRow([]))).toBe(0);
  expect(
    emptyMessageSize(streamingRow([{ type: 'text', text: 'First token' }])),
  ).toBeUndefined();
  expect(emptyMessageSize({ ...empty, streaming: false })).toBeUndefined();
});

it('lets Markdown measure the spacing between multiple blocks', () => {
  const block = { type: 'text', text: '' } as const;
  expect(emptyMessageSize(streamingRow([block, block]))).toBeUndefined();
});

it('keeps the same prompt identity when its Android height estimate changes', () => {
  const prompt: FeedRowData = {
    entry: {
      type: 'row',
      row: recordedUserMessage('agent-1', 'markdown-answer'),
    },
    spaceBelow: '',
    streaming: false,
  };

  const followed = { ...prompt, spaceBelow: 'pb-6' };

  expect(androidRowType(prompt)).not.toBe(androidRowType(followed));
  expect(rowKey(prompt)).toBe(rowKey(followed));
});

it('reuses the Working line estimate when an active group takes its place', () => {
  const header: FeedRowData = {
    entry: { type: 'live_header', liveHeader: workingHeader },
    spaceBelow: '',
    streaming: false,
  };

  const group: FeedRowData = {
    ...header,
    entry: {
      type: 'group',
      id: 'tools',
      title: 'Editing',
      items: [],
      state: 'open',
    },
  };

  expect(androidRowType(group)).toBe(androidRowType(header));
  expect(rowKey(group)).not.toBe(rowKey(header));
  expect(androidRowType({ ...group, spaceBelow: 'pb-4' })).toBe('group');
});
