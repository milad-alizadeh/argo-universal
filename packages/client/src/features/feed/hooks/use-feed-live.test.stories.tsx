import type { FeedSubscribeOutput } from '@repo/contracts';
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

const newestId = feedEventId(newest);

const meta = {
  title: 'Tests/Feed/UseFeedLive',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Mount = Parameters<NonNullable<Story['play']>>[0]['mount'];

// A change newer than anything the recorded stream holds, which the screen draws as one more revision.
function newerChange(): FeedSubscribeOutput {
  const [first] = rowEvents(stream);

  if (first?.type !== 'row.upsert')
    throw new Error('Recorded stream starts with a row');

  return { ...first, rev: newest.revision + 1 };
}

// The screen has shown a Session the App held, and the Server has replayed every change in the recorded stream above the cached revision.
async function streamedSession(mount: Mount): Promise<FeedLiveFixture> {
  const fixture = feedLiveFixture();
  await mount(<FeedLivePreview fixture={fixture} />);
  await waitFor(() => expect(fixture.server.opened).toHaveLength(1));
  await waitFor(() => expect(fixture.held()?.revision).toBe(newest.revision));

  return fixture;
}

// One more change reaches the screen: what a later state is waited on by.
async function laterChange(fixture: FeedLiveFixture): Promise<void> {
  fixture.send(newerChange());
  await waitFor(() =>
    expect(fixture.held()?.revision).toBe(newest.revision + 1),
  );
}

export const DrawsASessionSeenBeforeFromTheCacheWithNoPageRead: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} />);

    await waitFor(() => expect(fixture.held()?.ready).toBe(true));
    await expect(fixture.server.pageReads).toEqual([]);
  },
};

// A cold open is one subscription: no page is read first, and the tail and snapshot it opens with draw the Feed.
export const OpensASessionNotSeenBeforeWithTheSubscriptionAlone: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture({ seeded: false });
    await mount(<FeedLivePreview fixture={fixture} />);

    await waitFor(() => expect(fixture.server.opened).toEqual([undefined]));
    await expect(fixture.server.tailAsked).toEqual([true]);
    await expect(fixture.held()?.ready).toBe(false);

    fixture.answerTail();

    await waitFor(() => expect(fixture.held()?.ready).toBe(true));
    await expect(fixture.server.pageReads).toEqual([]);
    // The rows it brought are held, and do not open the subscription again.
    await expect(fixture.server.opened).toEqual([undefined]);
  },
};

// The Server replayed several changes on open: they are one write.
export const WritesABurstOfLiveChangesOncePerFrame: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    await expect(rowEvents(stream).length).toBeGreaterThan(1);
    await expect(fixture.feedWrites()).toBe(1);
  },
};

export const KeepsTheSnapshotItHoldsWhenTheNextIsEqual: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const held = fixture.held()?.snapshot;

    fixture.send({ type: 'snapshot', snapshot: { ...snapshot } });
    await laterChange(fixture);

    await expect(fixture.held()?.snapshot).toBe(held);
  },
};

// The subscription opens once, after the cached revision, and the rows it replays and later ones do not open it again.
export const OpensOnceAfterTheCachedRevision: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    await laterChange(fixture);

    await expect(fixture.server.opened).toEqual([seeded]);
  },
};

// tRPC's client resumes a lost socket by itself (the integration test proves it); a subscription that failed opens again when the Connection reopens, after the newest revision the cache holds then.
export const ReopensAFailedSubscriptionAfterTheNewestCachedRevision: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    fixture.fail();
    await waitFor(() => expect(fixture.held()?.openError).not.toBeNull());
    await fixture.connect('reconnecting');
    await fixture.connect('open');

    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    await expect(fixture.server.opened.at(-1)).toBe(newestId);
  },
};

// A closure shows why the Feed closed until the reader retries; the retry opens it again after the newest revision the cache holds.
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
    await expect(fixture.server.opened.at(-1)).toBe(newestId);
  },
};

// Hidden, the subscription closes; shown again, it opens after the newest revision the cache holds and has nothing newer to write.
export const OpensAfterTheCachedRevisionWhenShownAgain: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.show(false);
    await waitFor(() => expect(fixture.server.closed).toBe(1));

    fixture.show(true);
    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));

    await expect(fixture.server.opened.at(-1)).toBe(newestId);
    await laterChange(fixture);
    await expect(fixture.feedWrites()).toBe(writes + 1);
  },
};

// A frame the reader did not stay to see is dropped, not written once they are back.
export const DropsAFrameHeldWhenTheReaderLeaves: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    fixture.send(newerChange());
    fixture.show(false);
    await waitFor(() => expect(fixture.server.closed).toBe(1));

    fixture.show(true);
    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));

    await expect(fixture.window()?.revision).toBe(newest.revision);
  },
};

export const RetriesNothingForASessionItDoesNotShow: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} shown={false} />);
    await waitFor(() => expect(fixture.held()).toBeDefined());

    fixture.held()?.retryOpen();
    await fixture.connect('reconnecting');
    await fixture.connect('open');

    await expect(fixture.server.opened).toEqual([]);
  },
};

// The page before the window merges into the same query, and the newer rows stay.
export const LoadsOlderHistoryIntoTheSameWindow: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture({ seeded: false });
    await mount(<FeedLivePreview fixture={fixture} />);
    await waitFor(() => expect(fixture.server.tailAsked).toEqual([true]));

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
    await expect(fixture.server.pageReads).toHaveLength(1);
    await expect(fixture.server.pageReads.at(-1)).toMatchObject({
      direction: 'before',
    });
  },
};
