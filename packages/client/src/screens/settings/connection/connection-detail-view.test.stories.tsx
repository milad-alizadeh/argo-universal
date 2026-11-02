import { findToast } from '@repo/kit/mocks/find-toast';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
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
    await settleLayout('wide');
    await expect(
      await canvas.findByRole('heading', { name: 'Connection' }),
    ).toBeVisible();
    await expect(canvas.getByText(/Argo Server/)).toBeVisible();
    await settleLayout('phone');
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
    await expect(await canvas.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(canvas.queryByRole('progressbar')).toBeNull();
    await expect(canvas.queryByText('1.2.3')).toBeNull();
  },
};

// The page is never blank: a down Connection keeps the loading look until the Server answers.
export const KeepsLoadingWhileTheConnectionIsDown: Story = {
  args: { server: { status: 'down' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(canvas.queryByText('1.2.3')).toBeNull();
  },
};

export const ShowsSystemInfoErrorAsAToast: Story = {
  args: { server: { status: 'error', message: 'Server is down' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load the Server')).toBeVisible();
    await expect(await canvas.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(canvas.queryByText('1.2.3')).toBeNull();
  },
};

export const ShowsPlaceholderBeforeFirstClockTick: Story = {
  args: { server: { ...loadedServer, clock: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('…')).toBeVisible();
  },
};

const keepRunningName = 'Keep the Server running';

export const TurnsKeepRunningOn: Story = {
  args: { keepRunning: { enabled: false, onChange: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    const row = await canvas.findByRole('switch', { name: keepRunningName });
    await expect(row).not.toBeChecked();
    await userEvent.click(row);
    await expect(args.keepRunning?.onChange).toHaveBeenCalledWith(true);
  },
};

export const TurnsKeepRunningOff: Story = {
  args: { keepRunning: { enabled: true, onChange: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    const row = await canvas.findByRole('switch', { name: keepRunningName });
    await expect(row).toBeChecked();
    await userEvent.click(row);
    await expect(args.keepRunning?.onChange).toHaveBeenCalledWith(false);
  },
};

// A paired Device is handed no setting, so the row is not there to press.
export const OmitsKeepRunningForAPairedDevice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('1.2.3')).toBeVisible();
    await expect(canvas.queryByText(keepRunningName)).toBeNull();
  },
};

export const ShowsAFailedChangeAsAToast: Story = {
  args: {
    keepRunning: {
      enabled: false,
      error: 'Server is down',
      onChange: fn(),
    },
  },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not change the Server')).toBeVisible();
    await expect(
      canvas.getByRole('switch', { name: keepRunningName }),
    ).not.toBeChecked();
  },
};
