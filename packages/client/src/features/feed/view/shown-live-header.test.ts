import {
  type LiveHeader,
  runningCompactionStatus,
  type ToolCallUpdate,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { compactionStates } from '../../../../mocks/feed-paper';
import type { FeedViewItem } from './feed-view';
import { shownLiveHeader } from './shown-live-header';

const header = (
  source: LiveHeader['source'],
  text = 'Working',
): LiveHeader => ({
  text,
  source,
  startedAt: 1_000,
});

const openGroup: FeedViewItem = {
  type: 'group',
  id: 'group',
  title: 'Running pnpm test',
  state: 'open',
  items: [],
};

const settledGroup: FeedViewItem = { ...openGroup, state: 'settled' };

const exploring: FeedViewItem = {
  type: 'exploration',
  id: 'exploring',
  state: 'open',
  toolCalls: [],
};

function compaction(status: string): FeedViewItem {
  const row = compactionStates.find((state) => state.status === status);

  if (!row) throw new Error(`Feed mocks need a ${status} Compaction`);

  return { type: 'row', row };
}

const compacting = compaction(runningCompactionStatus);

describe('shownLiveHeader', () => {
  it.each([
    { source: { type: 'tool_call', toolCallId: 'tool' } as const },
    { source: { type: 'working' } as const },
  ])(
    'leaves a $source.type header out while open work names itself',
    ({ source }) => {
      expect(shownLiveHeader([openGroup], header(source))).toBeNull();
      expect(shownLiveHeader([exploring], header(source))).toBeNull();
      expect(shownLiveHeader([compacting], header(source))).toBeNull();
    },
  );

  it.each(['completed', 'failed', 'cancelled'])(
    'shows Working again once a Compaction is %s',
    (status) => {
      const value = header({ type: 'working' });
      expect(shownLiveHeader([compaction(status)], value)).toBe(value);
    },
  );

  // A settled group has only a counts summary, so it takes the header as its title while the Turn runs (#1410).
  it.each([
    { source: { type: 'tool_call', toolCallId: 'tool' } as const },
    { source: { type: 'working' } as const },
  ])(
    'keeps a $source.type header for a settled group to title',
    ({ source }) => {
      const value = header(source);
      expect(shownLiveHeader([settledGroup], value)).toBe(value);
    },
  );

  it.each([
    { source: { type: 'request' } as const },
    { source: { type: 'retry' } as const },
    { source: { type: 'thought' } as const },
  ])('keeps a $source.type header beside an open group', ({ source }) => {
    const value = header(source, 'Awaiting approval');
    expect(shownLiveHeader([openGroup], value)).toBe(value);
    expect(shownLiveHeader([exploring], value)).toBe(value);
    expect(shownLiveHeader([compacting], value)).toBe(value);
  });

  it('shows Working when nothing open draws the work', () => {
    const value = header({ type: 'working' });
    expect(shownLiveHeader([], value)).toBe(value);
    expect(shownLiveHeader([settledGroup], value)).toBe(value);
    expect(shownLiveHeader([openGroup, settledGroup], value)).toBe(value);
  });

  it('shows nothing without a live header', () => {
    expect(shownLiveHeader([openGroup], null)).toBeNull();
    expect(shownLiveHeader([exploring], null)).toBeNull();
  });

  // A Conversation steers its Prompt into the running Turn, so the person's words land below the Tool call that still runs.
  describe('with the named Tool call drawn above the person’s words', () => {
    const runningCommand: ToolCallUpdate = {
      id: 'command',
      sessionId: 'session-1',
      turnId: 'turn-1',
      position: 1,
      revision: 1,
      state: 'open',
      sessionUpdate: 'tool_call_update',
      toolCallId: 'command',
      title: 'Check formatting, commit and push',
      kind: 'execute',
      status: 'in_progress',
      content: [],
    };

    const steered: FeedViewItem = {
      type: 'row',
      row: {
        id: 'steered',
        sessionId: runningCommand.sessionId,
        turnId: runningCommand.turnId,
        position: runningCommand.position + 1,
        revision: runningCommand.revision + 1,
        state: 'settled',
        sessionUpdate: 'user_message',
        messageId: 'steered',
        content: [{ type: 'text', text: 'Also update the notes' }],
      },
    };

    const running = header({
      type: 'tool_call',
      toolCallId: runningCommand.toolCallId,
    });

    it.each<{ name: string; item: FeedViewItem }>([
      {
        name: 'a lone Tool call',
        item: { type: 'tool_call', row: runningCommand },
      },
      {
        name: 'an open group',
        item: {
          ...openGroup,
          items: [{ type: 'tool_call', row: runningCommand }],
        },
      },
      {
        name: 'an Exploration',
        item: { ...exploring, toolCalls: [runningCommand] },
      },
    ])('leaves the header out when $name draws it', ({ item }) => {
      expect(shownLiveHeader([item, steered], running)).toBeNull();
    });

    it('keeps the header once the Tool call above has settled', () => {
      const settled: FeedViewItem = {
        type: 'tool_call',
        row: { ...runningCommand, state: 'settled', status: 'completed' },
      };

      expect(shownLiveHeader([settled, steered], running)).toBe(running);
    });

    it('keeps a header naming another Tool call', () => {
      const other = header({ type: 'tool_call', toolCallId: 'other' });
      const item: FeedViewItem = { type: 'tool_call', row: runningCommand };

      expect(shownLiveHeader([item, steered], other)).toBe(other);
    });
  });
});
