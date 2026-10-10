import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ConnectionView } from './connection-view';
import { loadedServer } from './connection-view.fixtures';

const meta = {
  title: 'Tests/ConnectionScreen',
  component: ConnectionView,
  args: { connection: 'open', server: loadedServer },
} satisfies Meta<typeof ConnectionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsServerInfoAndClock: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('1.2.3')).toBeVisible();
    await expect(canvas.getByText('2026-10-03T09:00:00.000Z')).toBeVisible();
    await expect(canvas.getByText('4242')).toBeVisible();
    await expect(canvas.getByText('2026-10-03T10:00:00.000Z')).toBeVisible();
    // An open Connection shows no banner.
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

export const ShowsLoadingUntilServerAnswers: Story = {
  args: { server: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Connecting to the Server…')).toBeVisible();
    await expect(canvas.queryByText('Version')).toBeNull();
  },
};

export const ShowsSystemInfoError: Story = {
  args: { server: { status: 'error', message: 'Server is down' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Server is down')).toBeVisible();
    await expect(canvas.queryByText('Version')).toBeNull();
  },
};

export const ShowsPlaceholderBeforeFirstClockTick: Story = {
  args: { server: { ...loadedServer, clock: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Clock')).toBeVisible();
    await expect(canvas.getByText('…')).toBeVisible();
  },
};

export const ShowsReconnectingBanner: Story = {
  args: { connection: 'reconnecting' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Reconnecting to the Server…',
    );
    // The last data stays on screen while the Connection is down.
    await expect(canvas.getByText('4242')).toBeVisible();
  },
};

export const ShowsOfflineBanner: Story = {
  args: { connection: 'offline' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'The Server is offline. Argo keeps trying to reconnect.',
    );
  },
};
