import { activeSessions } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  type LiveSessionListFixture,
  LiveSessionListPreview,
  liveSessionListFixture,
} from '../../../mocks/sessions/live-session-list.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/LiveSessionList',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Mount = Parameters<NonNullable<Story['play']>>[0]['mount'];

const firstTitle = activeSessions.sessions[0]?.title ?? '';

// The list is drawn, its subscription has started, and no read is still on its way.
async function openedList(
  mount: Mount,
  canvasElement: HTMLElement,
  fixture: LiveSessionListFixture,
): Promise<ReturnType<typeof within>> {
  await mount(<LiveSessionListPreview fixture={fixture} />);
  const canvas = within(canvasElement);

  await expect(await canvas.findAllByText(firstTitle)).not.toHaveLength(0);
  await waitFor(() => expect(fixture.listUpdatesStarted()).toBe(1));
  await waitFor(() => expect(fixture.listFetching()).toBe(0));

  return canvas;
}

// The list's subscription starts as the list mounts, and rides the read it just made.
export const ReadsTheListOnceWhenItOpens: Story = {
  play: async ({ mount, canvasElement }) => {
    const fixture = liveSessionListFixture();
    await openedList(mount, canvasElement, fixture);

    await expect(fixture.listReads()).toBe(1);
  },
};

// A restart, here on returning to the foreground, may follow an outage that the Server's replay does not cover, so it reads the list again.
export const ReadsTheListAgainWhenItsSubscriptionRestarts: Story = {
  play: async ({ mount, canvasElement }) => {
    const fixture = liveSessionListFixture();
    const canvas = await openedList(mount, canvasElement, fixture);
    const stopped = within(canvasElement.ownerDocument.body);

    fixture.dropListUpdates();
    await stopped.findByText('Live updates stopped');
    fixture.returnToForeground();

    await waitFor(() => expect(fixture.listUpdatesStarted()).toBe(2));
    await waitFor(() => expect(fixture.listReads()).toBe(2));
    await expect(await canvas.findAllByText(firstTitle)).not.toHaveLength(0);
  },
};

// A read kept from the last visit is still fresh, but the list may have changed since, so the first start asks again.
export const ReadsTheListAgainWhenOpenedAgainWithinTheFreshWindow: Story = {
  play: async ({ mount, canvasElement }) => {
    const fixture = liveSessionListFixture();
    const canvas = await openedList(mount, canvasElement, fixture);

    fixture.screen.show(false);
    await waitFor(() =>
      expect(canvas.queryAllByText(firstTitle)).toHaveLength(0),
    );
    fixture.screen.show(true);

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

    await expect(await canvas.findAllByText(firstTitle)).not.toHaveLength(0);
    await expect(canvas.queryAllByTestId('session-logo')).toHaveLength(0);
    await expect(canvas.queryAllByTestId('icon-agent').length).toBeGreaterThan(
      0,
    );

    fixture.releaseAgents();

    await waitFor(() =>
      expect(canvas.queryAllByTestId('session-logo').length).toBeGreaterThan(0),
    );
  },
};
