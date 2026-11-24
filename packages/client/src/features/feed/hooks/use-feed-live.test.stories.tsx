import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { streamed } from '../../../../mocks/feed-state.mocks';
import {
  FeedLivePreview,
  restoreForeground,
  feedLiveFixture,
  type FeedLiveFixture,
} from '../../../../mocks/feed/feed-live.mocks';

const { snapshot } = streamed;

const newest = { epoch: 0, revision: snapshot.maxRevision };

const meta = {
  title: 'Tests/Feed/UseFeedLive',
  // Returning to the foreground changes the window's shared focus; the next story finds it as it was.
  beforeEach: (): (() => void) => restoreForeground,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Mount = Parameters<NonNullable<Story['play']>>[0]['mount'];

// Lets React draw the Connection's last state, as the seconds of a real outage do.
const settled = (): Promise<void> =>
  new Promise((resolve) => void setTimeout(resolve, 50));

// The screen has shown the Session, and the Server has replayed every change in the recorded stream above the cached revision.
async function streamedSession(mount: Mount): Promise<FeedLiveFixture> {
  const fixture = feedLiveFixture();
  await mount(<FeedLivePreview fixture={fixture} />);
  await waitFor(() => expect(fixture.server.opened).toHaveLength(1));

  await waitFor(() =>
    expect(fixture.held()?.revision).toBe(snapshot.maxRevision),
  );

  return fixture;
}

// A Server with nothing newer than the cached revision sends no rows, so the Feed is not written again.
export const ReopensAfterTheCachedRevisionAfterAReconnect: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.fail();
    await settled();
    fixture.connect('reconnecting');
    await settled();
    fixture.connect('open');

    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    await expect(fixture.server.opened.at(-1)).toEqual(newest);
    await expect(fixture.feedWrites()).toBe(writes);
  },
};

// The socket died without an error, so the subscription is still pending when the Connection comes back.
export const ReopensAfterTheCachedRevisionWhenTheSocketDiedSilently: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.connect('reconnecting');
    await settled();
    fixture.connect('open');

    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    await expect(fixture.server.opened.at(-1)).toEqual(newest);
    await expect(fixture.feedWrites()).toBe(writes);
  },
};

export const ReopensAfterTheCachedRevisionOnReturnToTheForeground: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.returnToForeground();

    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    await expect(fixture.server.opened.at(-1)).toEqual(newest);
    await expect(fixture.feedWrites()).toBe(writes);
  },
};

// Two returns in a row each open after the revision the cache holds then, not the one the screen last drew.
export const ReopensAfterTheRevisionHeldAtEachReturn: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);

    fixture.returnToForeground();
    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    fixture.returnToForeground();

    await waitFor(() => expect(fixture.server.opened).toHaveLength(3));
    await expect(fixture.server.opened.at(-1)).toEqual(newest);
  },
};

// A closure shows why the Feed closed until the reader retries; the retry reopens after the rows held, and writes nothing.
export const ShowsWhyTheFeedClosedUntilTheReaderRetries: Story = {
  play: async ({ mount }) => {
    const fixture = await streamedSession(mount);
    const writes = fixture.feedWrites();

    fixture.send({ type: 'closed', failure: 'Agent exited' });
    await waitFor(() =>
      expect(fixture.live()?.closure?.error?.message).toBe('Agent exited'),
    );

    fixture.live()?.retryOpen();

    await waitFor(() => expect(fixture.live()?.closure).toBeNull());
    await waitFor(() => expect(fixture.server.opened).toHaveLength(2));
    await expect(fixture.server.opened.at(-1)).toEqual(newest);
    await expect(fixture.feedWrites()).toBe(writes);
  },
};

// Before the Feed has rows there is nothing to open after, so a retry opens nothing until they arrive.
export const OpensNothingOnRetryUntilRowsArrive: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture({ seeded: false });
    await mount(<FeedLivePreview fixture={fixture} />);
    await waitFor(() => expect(fixture.live()).toBeDefined());

    fixture.live()?.retryOpen();
    await settled();

    await expect(fixture.server.opened).toEqual([]);
    await expect(fixture.live()?.closure).toBeNull();

    fixture.loadTail();

    await waitFor(() =>
      expect(fixture.server.opened).toEqual([{ epoch: 0, revision: 0 }]),
    );
  },
};

export const RetriesNothingForASessionItDoesNotShow: Story = {
  play: async ({ mount }) => {
    const fixture = feedLiveFixture();
    await mount(<FeedLivePreview fixture={fixture} shown={false} />);
    await waitFor(() => expect(fixture.live()).toBeDefined());

    fixture.live()?.retryOpen();
    fixture.returnToForeground();
    await settled();

    await expect(fixture.server.opened).toEqual([]);
  },
};
