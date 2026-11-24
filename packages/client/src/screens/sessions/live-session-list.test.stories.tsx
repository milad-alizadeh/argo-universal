import { activeSessions } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  LiveSessionListPreview,
  liveSessionListFixture,
} from '../../../mocks/sessions/live-session-list.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/LiveSessionList',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const settled = (): Promise<void> =>
  new Promise((resolve) => void setTimeout(resolve, 100));

// The list's subscription starts as the list mounts, and rides the read it just made.
export const ReadsTheListOnceWhenItOpens: Story = {
  play: async ({ mount }) => {
    const fixture = liveSessionListFixture();
    await mount(<LiveSessionListPreview fixture={fixture} />);

    await waitFor(() => expect(fixture.listUpdatesStarted()).toBe(1));
    await settled();

    await expect(fixture.listReads()).toBe(1);
  },
};

// A restart may follow an outage that the Server's replay does not cover, so it reads the list again.
export const ReadsTheListAgainWhenItsSubscriptionRestarts: Story = {
  play: async ({ mount }) => {
    const fixture = liveSessionListFixture();
    await mount(<LiveSessionListPreview fixture={fixture} />);
    await waitFor(() => expect(fixture.listUpdatesStarted()).toBe(1));
    await settled();

    fixture.dropListUpdates();
    fixture.connect('reconnecting');
    await settled();
    fixture.connect('open');

    await waitFor(() => expect(fixture.listUpdatesStarted()).toBe(2));
    await waitFor(() => expect(fixture.listReads()).toBe(2));
  },
};

// The Agents are lookups the rows draw with, not part of what the list waits for.
export const DrawsRowsBeforeTheAgentsArriveAndFillsInTheirLogos: Story = {
  play: async ({ mount, canvasElement }) => {
    const fixture = liveSessionListFixture();
    fixture.holdAgents();
    await mount(<LiveSessionListPreview fixture={fixture} />);
    const canvas = within(canvasElement);

    const title = activeSessions.sessions[0]?.title ?? '';
    await expect(await canvas.findAllByText(title)).not.toHaveLength(0);
    await expect(canvas.queryAllByTestId('session-logo')).toHaveLength(0);

    fixture.releaseAgents();

    await waitFor(() =>
      expect(canvas.queryAllByTestId('session-logo').length).toBeGreaterThan(0),
    );
  },
};
