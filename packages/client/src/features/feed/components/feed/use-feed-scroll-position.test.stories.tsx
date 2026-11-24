import type { LegendListRef } from '@legendapp/list/react-native';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { FeedViewItem } from '../../view/feed-view';
import { type FeedEntry } from './feed-entry';
import { scrollMemory } from './feed-scroll-memory';
import {
  type PositionList,
  useFeedScrollPosition,
} from './use-feed-scroll-position';

const group = (id: string): FeedViewItem => ({
  type: 'group',
  id,
  title: id,
  state: 'settled',
  items: [],
});

const rememberedRow = 'remembered';

const scrollToEnd = fn<LegendListRef['scrollToEnd']>(() => Promise.resolve());

const scrollToKey = fn<LegendListRef['scrollToKey']>(() => Promise.resolve());

const olderRowsAsked = fn<() => void>();

// A list near its start, as a Feed opened on its newest rows is while its older rows are still unloaded.
const nearStart: PositionList = {
  scrollToEnd,
  scrollToKey,
  cancelScroll: fn(),
  anchorVisibleContent: fn(() => ({ key: rememberedRow, offset: 0 })),
  getState: () => ({
    isNearStart: true,
    isAtEnd: true,
    isFollowingEnd: true,
    listen: () => (): void => {},
  }),
};

function Reading({ sessionId }: { sessionId: string }): React.JSX.Element {
  const list = useRef<PositionList | null>(nearStart);
  const [entries, setEntries] = useState<FeedEntry[]>([group('newest')]);

  const position = useFeedScrollPosition(list, {
    entries,
    newestKey: 'newest',
    sessionId,
    onStartReached: olderRowsAsked,
    loadingOlder: false,
    hasOlder: true,
  });

  // The older page lands by itself once asked for, not by a press the seek would take for the reader taking over.
  useEffect(() => {
    if (olderRowsAsked.mock.calls.length === 0) return;

    const landed = setTimeout(
      () => setEntries((rows) => [group(rememberedRow), ...rows]),
      50,
    );

    return (): void => clearTimeout(landed);
  }, [position.settled]);

  return (
    <View>
      <Button label="Settle" onPress={position.onReady} />
    </View>
  );
}

const meta = {
  title: 'Tests/Feed/UseFeedScrollPosition',
  component: Reading,
  tags: ['!autodocs'],
  args: { sessionId: 'opened-fresh' },
  beforeEach: (): void => {
    scrollToEnd.mockClear();
    scrollToKey.mockClear();
    olderRowsAsked.mockClear();
  },
} satisfies Meta<typeof Reading>;

export default meta;

type Story = StoryObj<typeof meta>;

const nextFrames = (): Promise<void> =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

export const OpensWithoutAnExtraScrollToEnd: Story = {
  play: async () => {
    await nextFrames();

    await expect(scrollToEnd).not.toHaveBeenCalled();
    await expect(scrollToKey).not.toHaveBeenCalled();
  },
};

export const AsksForOlderRowsOnlyOnceSettled: Story = {
  play: async ({ canvas }) => {
    await nextFrames();
    await expect(olderRowsAsked).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: 'Settle' }));

    await waitFor(() => expect(olderRowsAsked).toHaveBeenCalledOnce());
  },
};

export const SeeksARememberedRowOnceAfterSettlingAndFindingIt: Story = {
  args: { sessionId: 'left-mid-feed' },
  beforeEach: (): void => {
    scrollMemory.write('left-mid-feed', { key: rememberedRow, offset: 40 });
  },
  play: async ({ canvas }) => {
    await nextFrames();
    await expect(olderRowsAsked).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole('button', { name: 'Settle' }));
    await waitFor(() => expect(olderRowsAsked).toHaveBeenCalled());

    await waitFor(() => expect(scrollToKey).toHaveBeenCalledOnce());
    await nextFrames();
    await expect(scrollToKey).toHaveBeenCalledOnce();
    await expect(scrollToEnd).not.toHaveBeenCalled();
  },
};
