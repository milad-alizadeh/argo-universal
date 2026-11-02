import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { DeviceListView } from './device-list-view';
import { onlyThisComputer, threeDevices } from './device-list-view-fixtures';

const body = within(document.body);

const pairButton = { name: 'Pair a Device' };

const unpairPixel = { name: 'Unpair Pixel 9' };

const meta = {
  title: 'Tests/Screens/Settings/Devices',
  component: DeviceListView,
  parameters: { screenPreview: true },
  args: {
    accessEnabled: true,
    devices: threeDevices,
    onPairDevice: fn(),
    onUnpairDevice: fn(),
    onGoToConnection: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof DeviceListView>;

export default meta;

type Story = StoryObj<typeof meta>;

const openAlert = async (): Promise<ReturnType<typeof within>> =>
  within(await body.findByRole('dialog', { name: /Unpair “Pixel 9”\?/ }));

export const PairingOpensFromTheHeader: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pairButton));
    await expect(args.onPairDevice).toHaveBeenCalledOnce();
  },
};

export const ThisComputerHasNoUnpair: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('This computer')).toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: /^Unpair / }),
    ).toHaveLength(3);
  },
};

export const UnpairAsksFirstAndCancelKeepsTheDevice: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', unpairPixel));

    const alert = await openAlert();

    await userEvent.click(alert.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await expect(args.onUnpairDevice).not.toHaveBeenCalled();
  },
};

export const ConfirmingUnpairsThatDevice: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', unpairPixel));

    const alert = await openAlert();

    await userEvent.click(alert.getByRole('button', { name: 'Unpair' }));
    await expect(args.onUnpairDevice).toHaveBeenCalledWith('pixel');
  },
};

export const WithNoPairedDeviceItSaysSo: Story = {
  args: { devices: onlyThisComputer },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No other Devices yet')).toBeVisible();
    await expect(canvas.getByRole('button', pairButton)).toBeEnabled();
  },
};

export const PairingIsOffSendsTheOwnerToConnection: Story = {
  args: { accessEnabled: false, devices: onlyThisComputer },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText('Pairing is off')).toBeVisible();
    await expect(canvas.getByRole('button', pairButton)).toBeDisabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Go to Connection' }),
    );
    await expect(args.onGoToConnection).toHaveBeenCalledOnce();
  },
};

export const ABrowserIsNeverOfferedPairing: Story = {
  args: { pairingOffered: false, devices: onlyThisComputer },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', pairButton)).toBeNull();
  },
};
