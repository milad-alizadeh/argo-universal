import type { LiveHeader } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { FeedViewItem } from '../../view/feed-view';
import { completedCommand, runningCommand } from '../tool-call.mocks';
import { withLiveHeader } from './feed-entry';

const working: LiveHeader = {
  text: 'Working',
  source: { type: 'working' },
  startedAt: 1_000,
};

const thought: LiveHeader = {
  text: 'Checking the config',
  source: { type: 'thought' },
  startedAt: 1_000,
};

const settledCall: FeedViewItem = { type: 'tool_call', row: completedCommand };

describe('withLiveHeader beside a lone Tool call', () => {
  // Working is part of the Turn's work, never a line below a Tool call that already settled.
  it('wraps the Tool call in a group the live header titles', () => {
    expect(withLiveHeader([settledCall], working)).toEqual([
      {
        type: 'group',
        id: completedCommand.id,
        title: expect.any(String),
        state: 'settled',
        items: [settledCall],
        liveHeader: working,
      },
    ]);
  });

  it('leaves the Tool call alone once the Turn ends', () => {
    expect(withLiveHeader([settledCall], null)).toEqual([settledCall]);
  });

  it('keeps a thought its own line', () => {
    expect(withLiveHeader([settledCall], thought)).toEqual([
      settledCall,
      { type: 'live_header', liveHeader: thought, toolCall: undefined },
    ]);
  });

  it('keeps the live header its own line beside an open Exploration', () => {
    const exploring: FeedViewItem = {
      type: 'exploration',
      id: 'exploring',
      state: 'open',
      toolCalls: [],
    };

    expect(withLiveHeader([exploring], thought)).toEqual([
      exploring,
      { type: 'live_header', liveHeader: thought, toolCall: undefined },
    ]);
  });
});

// A Conversation steers the person's words into the running Turn, below the Tool call still running.
describe('withLiveHeader below the person’s words', () => {
  it('draws no second line for the Tool call already drawn above', () => {
    const running: LiveHeader = {
      text: runningCommand.title,
      source: { type: 'tool_call', toolCallId: runningCommand.toolCallId },
      startedAt: 1_000,
    };

    const drawn: FeedViewItem[] = [
      { type: 'tool_call', row: runningCommand },
      {
        type: 'row',
        row: {
          id: 'spoken',
          sessionId: runningCommand.sessionId,
          turnId: runningCommand.turnId,
          position: runningCommand.position + 1,
          revision: 1,
          state: 'settled',
          sessionUpdate: 'user_message',
          messageId: 'spoken',
          content: [{ type: 'text', text: 'Also update the notes' }],
        },
      },
    ];

    expect(withLiveHeader(drawn, running, runningCommand)).toEqual(drawn);
  });
});
