import { layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ConnectionDetailView } from './connection-detail-view';
import { loadedServer } from './connection-detail-view.fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Connection',
  component: ConnectionDetailView,
  args: { server: loadedServer },
} satisfies Meta<typeof ConnectionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsServerInfoAndClock: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('1.2.3')).toBeVisible();
    await expect(canvas.getByText(/^.+ at \d{2}:\d{2}$/)).toBeVisible();
    await expect(canvas.getByText('4242')).toBeVisible();
    await expect(canvas.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible();
    // An open Connection shows no banner.
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

// Screen owns where its title goes at each width; this checks the caption shows on a wide window only.
export const CaptionsThePageOnWideWindows: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByRole('heading', { name: 'Connection' }),
    ).toBeVisible();
    await expect(canvas.getByText(/Argo Server/)).toBeVisible();
    await settleViewport(layoutWidths.phone);
    await expect(canvas.queryByText(/Argo Server/)).toBeNull();
    await expect(canvas.getByText('4242')).toBeVisible();
  },
};

export const LeavesRouteAndUnpairOut: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Route/)).toBeNull();
    await expect(canvas.queryByRole('button', { name: /Unpair/ })).toBeNull();
    await expect(canvas.queryByText(/Unpair/)).toBeNull();
  },
};

export const ShowsConnectingUntilServerAnswers: Story = {
  args: { server: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Connecting to the Server…')).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toBeVisible();
    await expect(canvas.queryByText('Version')).toBeNull();
  },
};

export const ShowsSystemInfoErrorAsAToast: Story = {
  args: { server: { status: 'error', message: 'Server is down' } },
  play: async ({ canvas }) => {
    await expect(
      await findToast("Could not load the Server's details"),
    ).toBeVisible();
    await expect(canvas.getByText(/^Connecting to the Server/)).toBeVisible();
    await expect(canvas.queryByText('Version')).toBeNull();
  },
};

export const ShowsPlaceholderBeforeFirstClockTick: Story = {
  args: { server: { ...loadedServer, clock: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('…')).toBeVisible();
  },
};
