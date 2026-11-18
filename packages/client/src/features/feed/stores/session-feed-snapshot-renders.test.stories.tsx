import { renderCounter } from '@repo/kit/mocks/render-counts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  type JSX,
  Profiler,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { expect, waitFor } from 'storybook/test';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import { keptFeeds } from '../../../../mocks/feed/session-feed-store.mocks';
import { waitForFrame } from '../hooks/frame-wait';
import { toFeedView } from '../view/to-feed-view';
import { SessionFeedStore } from './session-feed-store';

const { rows, snapshot, stream } = streamed;

const renders = renderCounter();

const newStore = (): SessionFeedStore =>
  new SessionFeedStore({
    kept: keptFeeds().slotOf('session-1'),
    frame: waitForFrame,
    fetchRow: (): Promise<never> =>
      Promise.reject(new Error('No row to fetch')),
    resetHistory: (): Promise<void> => Promise.resolve(),
    translate: toFeedView,
  });

// The store this visit of the story drew, made new by each render so a repeat starts from nothing.
interface Visit {
  store: SessionFeedStore | null;
}

const visit: Visit = { store: null };

// What a screen shows of the Session: it renders when the store's state does.
function SessionFeedScreen(): JSX.Element {
  const [store] = useState(newStore);
  useEffect(() => {
    visit.store = store;
  }, [store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return <span>{`${state.view?.items.length ?? 0} items`}</span>;
}

const meta = {
  title: 'Tests/Feed/SessionFeedSnapshotRenders',
  render: (): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <SessionFeedScreen />
    </Profiler>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const streamedChanges = rowEvents(stream);

// A store-level render test: the Session page needs a server, so the screen here is the store's own subscriber. The Server sends a snapshot with each row commit, and again when only its revision moved; the screen draws once for the frame of rows, and snapshots add no draw.
export const SnapshotDrawsNoMoreThanRows: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(visit.store).not.toBeNull());
    const store = visit.store ?? newStore();
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
