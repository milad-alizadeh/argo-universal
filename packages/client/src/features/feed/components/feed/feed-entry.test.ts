import type { LiveHeader } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { FeedViewItem } from '../../view/feed-view';
import { withLiveHeader } from './feed-entry';

const thought: LiveHeader = {
  text: 'Moving temp directory',
  source: { type: 'thought' },
  startedAt: 1_000,
};

const openGroup: FeedViewItem = {
  type: 'group',
  id: 'group',
  title: 'Ran 11 commands, Read 11 files',
  state: 'open',
  items: [],
};

describe('withLiveHeader', () => {
  it('gives the newest open group the live header as its title', () => {
    expect(withLiveHeader([openGroup], thought)).toEqual([
      { ...openGroup, liveHeader: thought },
    ]);
  });

  // #1410: the Session row's activity line is the live header, so a settled group with the Turn still running must not draw a second, different line.
  it('gives a settled group the live header as its title while the Turn runs', () => {
    const settled: FeedViewItem = { ...openGroup, state: 'settled' };

    expect(withLiveHeader([settled], thought)).toEqual([
      { ...settled, liveHeader: thought },
    ]);
  });

  it('titles the newest group with the same line the Session row shows', () => {
    const live: LiveHeader = {
      text: 'Creating empty config',
      source: { type: 'tool_call', toolCallId: 'tool-1' },
      startedAt: 1_000,
    };
    const settled: FeedViewItem = { ...openGroup, state: 'settled' };

    for (const items of [[openGroup], [settled]])
      expect(withLiveHeader(items, live)).toEqual([
        { ...items[0], liveHeader: live },
      ]);
  });

  it('draws the live header as its own row after an Agent message', () => {
    const message: FeedViewItem = {
      type: 'row',
      row: {
        id: 'message-1',
        sessionId: 'session-1',
        turnId: 'turn-1',
        position: 1,
        revision: 1,
        state: 'settled',
        sessionUpdate: 'agent_message',
        messageId: 'message-1',
        content: [{ type: 'text', text: 'Done' }],
      },
    };

    expect(withLiveHeader([message], thought)).toEqual([
      message,
      { type: 'live_header', liveHeader: thought, toolCall: undefined },
    ]);
  });

  it('leaves an open group alone without a live header', () => {
    expect(withLiveHeader([openGroup], null)).toEqual([openGroup]);
  });
});
