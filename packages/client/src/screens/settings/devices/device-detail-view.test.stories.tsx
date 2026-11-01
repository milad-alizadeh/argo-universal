import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { DeviceDetailView } from './device-detail-view';
import { pairedPhone } from './device-detail-view-fixtures';

const body = within(document.body);

const meta = {
  title: 'Tests/Screens/Settings/Devices/Device',
  component: DeviceDetailView,
  parameters: { screenPreview: true },
  args: { device: pairedPhone, onUnpair: fn() },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof DeviceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const openAlert = async (): Promise<ReturnType<typeof within>> =>
  within(await body.findByRole('dialog', { name: /Unpair “iPhone 15 Pro”\?/ }));

export const ShowsWhatTheServerKnowsOfTheDevice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('iOS')).toBeVisible();
    await expect(canvas.getByText('21 Oct')).toBeVisible();
    await expect(canvas.getByText('Active now')).toBeVisible();
  },
};

export const UnpairAsksFirstAndCancelKeepsTheDevice: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unpair this Device' }),
    );

    const alert = await openAlert();

    await expect(alert.getByText(/even mid-Session/)).toBeVisible();
    await userEvent.click(alert.getByRole('button', { name: 'Cancel' }));
    await expect(args.onUnpair).not.toHaveBeenCalled();
  },
};

export const ConfirmingUnpairsTheDevice: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unpair this Device' }),
    );

    const alert = await openAlert();

    await userEvent.click(alert.getByRole('button', { name: 'Unpair' }));
    await expect(args.onUnpair).toHaveBeenCalledOnce();
  },
};

export const AMissingDeviceOffersNoUnpair: Story = {
  args: { device: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
