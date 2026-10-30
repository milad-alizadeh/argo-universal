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

  it('draws the live header as its own row after a settled group', () => {
    const settled: FeedViewItem = { ...openGroup, state: 'settled' };

    expect(withLiveHeader([settled], thought)).toEqual([
      settled,
      { type: 'live_header', liveHeader: thought, toolCall: undefined },
    ]);
  });

  it('leaves an open group alone without a live header', () => {
    expect(withLiveHeader([openGroup], null)).toEqual([openGroup]);
  });
});
