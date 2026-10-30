import type { LiveHeader } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
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

describe('shownLiveHeader', () => {
  it.each([
    { source: { type: 'tool_call', toolCallId: 'tool' } as const },
    { source: { type: 'working' } as const },
  ])(
    'leaves a $source.type header out while an open Exploration draws the work',
    ({ source }) => {
      expect(shownLiveHeader([exploring], header(source))).toBeNull();
    },
  );

  // A group takes the header as its title (#1405), so the Feed says what the Session row's activity line says (#1410).
  it.each([
    { source: { type: 'tool_call', toolCallId: 'tool' } as const },
    { source: { type: 'working' } as const },
  ])('keeps a $source.type header for a group to title', ({ source }) => {
    const value = header(source);
    expect(shownLiveHeader([openGroup], value)).toBe(value);
    expect(shownLiveHeader([settledGroup], value)).toBe(value);
  });

  it.each([
    { source: { type: 'request' } as const },
    { source: { type: 'retry' } as const },
    { source: { type: 'thought' } as const },
  ])('keeps a $source.type header beside an open group', ({ source }) => {
    const value = header(source, 'Awaiting approval');
    expect(shownLiveHeader([openGroup], value)).toBe(value);
    expect(shownLiveHeader([exploring], value)).toBe(value);
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
});
