import { renderCounter } from '@repo/kit/mocks/render-counts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler, useEffect, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import { FeedCacheScreen } from '../../../../mocks/feed/feed-cache-screen.mocks';
import { waitForFrame } from '../hooks/frame-wait';
import type { FeedCache } from './feed-cache';

const { rows, snapshot, stream } = streamed;

const renders = renderCounter();

// The cache this visit of the story drew, and a way to redraw the Marker.
interface Visit {
  cache: FeedCache | null;
  // Redraws the Marker, which proves the counter was watching when the screen drew nothing.
  mark: () => void;
}

const visit: Visit = { cache: null, mark: () => {} };

// Draws on demand, beside the screen: a count of 0 for the screen means something only while this one is counted.
function Marker(): JSX.Element {
  const [marks, setMarks] = useState(0);
  useEffect(() => {
    visit.mark = (): void => setMarks((count) => count + 1);
  }, []);

  return <span>{`${marks} marks`}</span>;
}

const meta = {
  title: 'Tests/Feed/FeedCacheHiddenRenders',
  render: (): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <FeedCacheScreen
        onCache={(cache) => {
          visit.cache = cache;
        }}
      />
      <Marker />
    </Profiler>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const streamedChanges = rowEvents(stream);

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => void waitForFrame(resolve));

const streamInto = (cache: FeedCache): void => {
  for (const event of streamedChanges) cache.receive(event);
};

// The cache this visit drew, written at its first page and then hidden, as a retained page the person left.
async function hiddenCache(): Promise<FeedCache> {
  await waitFor(() => expect(visit.cache).not.toBeNull());
  const cache = visit.cache;

  if (!cache) throw new Error('The screen draws a cache');
  await waitFor(() => expect(cache.read().epoch).not.toBeNull());
  const stop = cache.start();
  cache.receive({ type: 'snapshot', snapshot });
  await waitFor(() => expect(cache.readSnapshot()).not.toBeNull());
  stop();

  return cache;
}

// A cache-level render test: the Session page needs a server, so the screen here reads the Feed's own queries. A hidden retained page has stopped its cache, so its Session streaming on draws it 0 times.
export const HiddenPageDrawsNothingWhileItsSessionStreams: Story = {
  play: async ({ canvasElement }) => {
    const cache = await hiddenCache();

    const counts = await renders.during(canvasElement, async () => {
      streamInto(cache);
      await nextFrame();
      await nextFrame();
      visit.mark();
      await nextFrame();
    });

    await expect(counts.Marker?.updates).toHaveLength(1);
    await expect(counts.SessionFeedScreen).toBeUndefined();
    await expect(cache.read().rows).toEqual([]);
  },
};

// Shown again, its subscription replays what it missed and the screen draws those rows once, in order.
export const ShownPageDrawsTheRowsItMissedOnce: Story = {
  play: async ({ canvasElement }) => {
    const cache = await hiddenCache();

    const counts = await renders.during(canvasElement, async () => {
      cache.start();
      streamInto(cache);
      await waitFor(() => expect(cache.read().rows).toEqual(rows));
    });

    await expect(counts.SessionFeedScreen?.updates).toHaveLength(1);
  },
};
