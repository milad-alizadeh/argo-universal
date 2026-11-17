import { renderCounter } from '@repo/kit/mocks/render-counts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler, useSyncExternalStore } from 'react';
import { expect, waitFor } from 'storybook/test';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import { keptFeeds } from '../../../../mocks/feed/session-feed-store.mocks';
import { waitForFrame } from '../hooks/frame-wait';
import { toFeedView } from '../view/to-feed-view';
import { SessionFeedStore } from './session-feed-store';

const { rows, snapshot, stream } = streamed;

const renders = renderCounter();

const store = new SessionFeedStore({
  kept: keptFeeds().slotOf('session-1'),
  frame: waitForFrame,
  fetchRow: (): Promise<never> => Promise.reject(new Error('No row to fetch')),
  resetHistory: (): Promise<void> => Promise.resolve(),
  translate: toFeedView,
});

// What a screen shows of the Session: it renders when the store's state does.
function SessionFeedScreen(): JSX.Element {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return <span>{`${state.view?.items.length ?? 0} items`}</span>;
}

const meta = {
  title: 'Tests/Feed/SnapshotRenders',
  render: (): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <SessionFeedScreen />
    </Profiler>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const streamedChanges = rowEvents(stream);

// The Server sends a snapshot with each row commit, and again when only its revision moved; the screen draws once for the frame of rows, and snapshots add no draw.
export const SnapshotDrawsNoMoreThanRows: Story = {
  play: async ({ canvasElement }) => {
    const stop = store.start();
    store.mergeHistory([page([], 0)]);
    store.receive({ type: 'snapshot', snapshot });
    await waitFor(() => expect(store.getState().view).not.toBeNull());

    const counts = await renders.during(canvasElement, async () => {
      for (const event of streamedChanges) {
        store.receive(event);
        store.receive({ type: 'snapshot', snapshot: { ...snapshot } });
      }

      await waitFor(() => expect(store.getState().feed.rows).toEqual(rows));
    });

    stop();
    await expect(counts.SessionFeedScreen?.updates).toHaveLength(1);
    await expect(store.getState().snapshot).toBe(snapshot);
  },
};
