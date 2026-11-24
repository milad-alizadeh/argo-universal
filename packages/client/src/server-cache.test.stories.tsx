import { feedEventId } from '@repo/contracts';
import { activeSessions } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  ServerCachePreview,
  serverCacheFixture,
} from '../mocks/server-cache.mocks';

const meta = {
  title: 'Tests/ServerCache',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const firstTitle = activeSessions.sessions[0]?.title ?? '';

const storedId = feedEventId({ epoch: 0, revision: 0 });

const settleMs = 150;

// A Device that answers late must not let the Feed open cold: the subscription waits for what the Device kept.
export const OpensTheFeedAfterTheStoredRevisionOnceASlowDeviceAnswers: Story = {
  play: async ({ mount, canvas }) => {
    const fixture = serverCacheFixture('open', { slow: true });
    await mount(<ServerCachePreview fixture={fixture} />);
    await new Promise((wait) => setTimeout(wait, settleMs));

    await expect(fixture.opened).toEqual([]);
    await expect(fixture.listUpdates()).toBe(0);
    await expect(canvas.getByText('No Feed')).toBeVisible();

    fixture.release();

    await waitFor(() => expect(fixture.opened).toEqual([storedId]));
    await waitFor(() => expect(fixture.listUpdates()).toBe(1));
    await expect(await canvas.findByText('Feed at revision 0')).toBeVisible();
  },
};

// With the Server unreachable the Session list and a Feed seen before still draw, beside the Connection's own banner.
export const DrawsWhatTheDeviceKeptBesideTheCannotReachBanner: Story = {
  play: async ({ mount, canvas }) => {
    const fixture = serverCacheFixture('offline', { slow: false });
    await mount(<ServerCachePreview fixture={fixture} />);

    await expect(await canvas.findAllByText(firstTitle)).not.toHaveLength(0);
    await expect(await canvas.findByText('Feed at revision 0')).toBeVisible();
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      /Can't reach/,
    );
  },
};
