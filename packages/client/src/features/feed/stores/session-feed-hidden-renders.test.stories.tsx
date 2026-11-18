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
  // Redraws the Marker, which proves the counter was watching when the screen drew nothing.
  mark: () => void;
}

const visit: Visit = { store: null, mark: () => {} };

// Draws on demand, beside the screen: a count of 0 for the screen means something only while this one is counted.
function Marker(): JSX.Element {
  const [marks, setMarks] = useState(0);
  useEffect(() => {
    visit.mark = (): void => setMarks((count) => count + 1);
  }, []);

  return <span>{`${marks} marks`}</span>;
}

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
  title: 'Tests/Feed/SessionFeedHiddenRenders',
  render: (): JSX.Element => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <SessionFeedScreen />
      <Marker />
    </Profiler>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const streamedChanges = rowEvents(stream);

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => void waitForFrame(resolve));

const streamInto = (store: SessionFeedStore): void => {
  for (const event of streamedChanges) store.receive(event);
};

// The store this visit drew, committed at its first page and then hidden, as a retained page the person left.
async function hiddenStore(): Promise<SessionFeedStore> {
  await waitFor(() => expect(visit.store).not.toBeNull());
  const store = visit.store ?? newStore();
  const stop = store.start();
  store.mergeHistory([page([], 0)]);
  store.receive({ type: 'snapshot', snapshot });
  await waitFor(() => expect(store.getState().view).not.toBeNull());
  stop();

  return store;
}

// A store-level render test: the Session page needs a server, so the screen here is the store's own subscriber. A hidden retained page has stopped its store, so its Session streaming on draws it 0 times.
export const HiddenPageDrawsNothingWhileItsSessionStreams: Story = {
  play: async ({ canvasElement }) => {
    const store = await hiddenStore();

    const counts = await renders.during(canvasElement, async () => {
      streamInto(store);
      await nextFrame();
      await nextFrame();
      visit.mark();
      await nextFrame();
    });

    await expect(counts.Marker?.updates).toHaveLength(1);
    await expect(counts.SessionFeedScreen).toBeUndefined();
    await expect(store.getState().feed.rows).toEqual([]);
  },
};

// Shown again, its subscription replays what it missed and the screen draws those rows once, in order.
export const ShownPageDrawsTheRowsItMissedOnce: Story = {
  play: async ({ canvasElement }) => {
    const store = await hiddenStore();

    const counts = await renders.during(canvasElement, async () => {
      store.start();
      streamInto(store);
      await waitFor(() => expect(store.getState().feed.rows).toEqual(rows));
    });

    await expect(counts.SessionFeedScreen?.updates).toHaveLength(1);
  },
};
