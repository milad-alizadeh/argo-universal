import { feedEventId } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { page, rowEvents, streamed } from '../../../../mocks/feed-state.mocks';
import {
  FeedLivePreview,
  feedLiveFixture,
  type FeedLiveFixture,
} from '../../../../mocks/feed/feed-live.mocks';

const { snapshot, stream } = streamed;

const newest = { epoch: 0, revision: snapshot.maxRevision };

const seeded = feedEventId({ epoch: 0, revision: 0 });

const meta = {
  title: 'Tests/Feed/UseFeedLive',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Mount = Parameters<NonNullable<Story['play']>>[0]['mount'];

// Lets React draw the last state, as the seconds of a real outage do.
const settled = (): Promise<void> =>
  new Promise((resolve) => void setTimeout(resolve, 50));

// The screen has shown a Session the App held, and the Server has replayed every change in the recorded stream above the cached revision.
async function streamedSession(mount: Mount): Promise<FeedLiveFixture> {
  const fixture = feedLiveFixture();
  await mount(<FeedLivePreview fixture={fixture} />);
  await waitFor(() => expect(fixture.server.opened).toHaveLength(1));
  await waitFor(() => expect(fixture.held()?.revision).toBe(newest.revision));

  return fixture;
}

export const DrawsASessionSeenBeforeFromTheCacheWithNoPageRead: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} />);

    await waitFor(() => expect(fixture.held()?.ready).toBe(true));
    await expect(fixture.server.pageReads).toEqual([]);
  },
};

export const OpensOnTheTailPageOfASessionNotSeenBefore: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture({ seeded: false });
    await mount(<FeedLivePreview fixture={fixture} />);

    await waitFor(() => expect(fixture.server.pageReads).toHaveLength(1));
    await settled();

    // Nothing to open after until the first rows are held.
    await expect(fixture.server.opened).toEqual([]);

    fixture.answerTail();

    await waitFor(() => expect(fixture.server.opened).toEqual([seeded]));
  },
};

// The page before the window merges into the same query, and the newer rows stay.
export const LoadsOlderHistoryIntoTheSameWindow: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture({ seeded: false });
    await mount(<FeedLivePreview fixture={fixture} />);
    await waitFor(() => expect(fixture.server.pageReads).toHaveLength(1));

    fixture.answerTail({
      ...page(streamed.rows, newest.revision, { limit: 2 }),
      hasOlder: true,
    });
    await waitFor(() => expect(fixture.window()?.rows).toHaveLength(2));
    const newer = fixture.window()?.rows;

    await fixture.held()?.loadOlder();

    const merged = fixture.window()?.rows ?? [];
    await expect(merged.length).toBeGreaterThan(2);
    await expect(merged.slice(-2)).toEqual(newer);
    await expect(fixture.server.pageReads.at(-1)).toMatchObject({
      direction: 'before',
    });
  },
};

export const WritesABurstOfLiveChangesOncePerFrame: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} />);
    await waitFor(() => expect(fixture.server.opened).toHaveLength(1));
    await waitFor(() => expect(fixture.held()?.revision).toBe(newest.revision));

    // The Server replayed several changes on open: they are one write.
    await expect(rowEvents(stream).length).toBeGreaterThan(1);
    await expect(fixture.feedWrites()).toBe(1);
  },
};

export const KeepsTheSnapshotItHoldsWhenTheNextIsEqual: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.send({ type: 'snapshot', snapshot: { ...snapshot } });
    await settled();

    await expect(fixture.feedWrites()).toBe(writes);
  },
};

// The subscription opens once, after the cached revision, and the rows it replays do not open it again.
export const OpensOnceAfterTheCachedRevision: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    await settled();

    await expect(fixture.server.opened).toEqual([seeded]);
  },
};

// tRPC's client resumes a lost socket by itself (the integration test proves it); a subscription that failed opens again when the Connection reopens.
export const ReopensAFailedSubscriptionWhenTheConnectionReopens: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    fixture.fail();
    await settled();
    fixture.connect('reconnecting');
    await settled();
    fixture.connect('open');

    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
  },
};

// A closure shows why the Feed closed until the reader retries; the retry opens it again.
export const ShowsWhyTheFeedClosedUntilTheReaderRetries: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    fixture.send({ type: 'closed', failure: 'Agent exited' });
    await waitFor(() =>
      expect(fixture.held()?.openError?.message).toBe('Agent exited'),
    );

    fixture.held()?.retryOpen();

    await waitFor(() => expect(fixture.held()?.openError).toBeNull());
    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
  },
};

export const RetriesNothingForASessionItDoesNotShow: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} shown={false} />);
    await waitFor(() => expect(fixture.held()).toBeDefined());

    fixture.held()?.retryOpen();
    await settled();

    await expect(fixture.server.opened).toEqual([]);
  },
};
