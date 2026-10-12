import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { findToast } from '../../../../mocks/find-toast';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { ConnectionDetailView } from './connection-detail-view';
import { loadedServer } from './connection-detail-view.fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Connection',
  component: ConnectionDetailView,
  args: { connection: 'open', server: loadedServer },
} satisfies Meta<typeof ConnectionDetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsServerInfoAndClock: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Version, 1.2.3' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: /^Started, .+ at \d{2}:\d{2}$/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'PID, 4242' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: /^Clock, \d{2}:\d{2}:\d{2}$/ }),
    ).toBeVisible();
    // An open Connection shows no banner.
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

// A wide window's page carries its title and caption; a phone's native header carries the title instead.
export const TitlesThePageOnWideWindows: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      await canvas.findByRole('heading', { name: 'Connection' }),
    ).toBeVisible();
    await expect(
      canvas.getByText('The Argo Server this App is talking to.'),
    ).toBeVisible();
    await settleViewport(layoutWidths.phone);
    await expect(
      canvas.queryByRole('heading', { name: 'Connection' }),
    ).toBeNull();
    await expect(
      canvas.getByRole('group', { name: 'PID, 4242' }),
    ).toBeVisible();
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
    await expect(
      canvas.getByRole('group', { name: 'Connecting to the Server…' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('group', { name: /^Version/ })).toBeNull();
  },
};

export const ShowsSystemInfoErrorAsAToast: Story = {
  args: { server: { status: 'error', message: 'Server is down' } },
  play: async ({ canvas }) => {
    await expect(
      await findToast("Could not load the Server's details"),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: /^Connecting to the Server/ }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: 'Server is down' }),
    ).toBeNull();
    await expect(canvas.queryByRole('group', { name: /^Version/ })).toBeNull();
  },
};

export const ShowsPlaceholderBeforeFirstClockTick: Story = {
  args: { server: { ...loadedServer, clock: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Clock, …' })).toBeVisible();
  },
};

export const ShowsReconnectingBanner: Story = {
  args: { connection: 'reconnecting' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Reconnecting to the Server…',
    );
    // The last data stays on screen while the Connection is down.
    await expect(
      canvas.getByRole('group', { name: 'PID, 4242' }),
    ).toBeVisible();
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
