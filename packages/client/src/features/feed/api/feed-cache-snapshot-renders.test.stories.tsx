import { renderCounter } from '@repo/kit/mocks/render-counts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler } from 'react';
import { expect, waitFor } from 'storybook/test';
import { rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import { FeedCacheScreen } from '../../../../mocks/feed/feed-cache-screen.mocks';
import type { FeedCache } from './feed-cache';

const { rows, snapshot, stream } = streamed;

const renders = renderCounter();

// The cache this visit of the story drew.
interface Visit {
  cache: FeedCache | null;
}

const visit: Visit = { cache: null };

const meta = {
  title: 'Tests/Feed/FeedCacheSnapshotRenders',
  render: (): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <FeedCacheScreen
        onCache={(cache) => {
          visit.cache = cache;
        }}
      />
    </Profiler>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const streamedChanges = rowEvents(stream);

// A cache-level render test: the Session page needs a server, so the screen here reads the Feed's own queries. The Server sends a snapshot with each row commit, and again when only its revision moved; the screen draws once for the frame of rows, and snapshots add no draw.
export const SnapshotDrawsNoMoreThanRows: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(visit.cache?.read().epoch).toBeDefined());
    const cache = visit.cache;

    if (!cache) throw new Error('The screen draws a cache');
    await waitFor(() => expect(cache.read().epoch).not.toBeNull());
    const stop = cache.start();
    cache.receive({ type: 'snapshot', snapshot });
    await waitFor(() => expect(cache.readSnapshot()).not.toBeNull());

    const counts = await renders.during(canvasElement, async () => {
      for (const event of streamedChanges) {
        cache.receive(event);
        cache.receive({ type: 'snapshot', snapshot: { ...snapshot } });
      }

      await waitFor(() => expect(cache.read().rows).toEqual(rows));
    });

    stop();
    await expect(counts.SessionFeedScreen?.updates).toHaveLength(1);
    await expect(cache.readSnapshot()).toBe(snapshot);
  },
};
