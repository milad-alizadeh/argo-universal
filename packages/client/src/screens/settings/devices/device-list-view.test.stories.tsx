import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { DeviceListView } from './device-list-view';

const switchName = 'Local network access';

const meta = {
  title: 'Tests/Screens/Settings/Devices',
  component: DeviceListView,
  parameters: { screenPreview: true },
  args: {
    localNetworkAccess: { status: 'loaded', enabled: false },
    onLocalNetworkAccessChange: fn(),
    onRetry: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof DeviceListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StartsOffAndPairingSaysWhyItIsUnavailable: Story = {
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole('switch', { name: switchName }),
    ).not.toBeChecked();
    await expect(
      canvas.getByRole('button', { name: 'Pair a Device' }),
    ).toBeDisabled();
    await expect(
      canvas.getByText(
        /Pairing is unavailable while Local network access is off/,
      ),
    ).toBeVisible();
    await expect(args.onLocalNetworkAccessChange).not.toHaveBeenCalled();
  },
};

export const TurnsOnOnlyWhenTheOwnerPressesTheSwitch: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(args.onLocalNetworkAccessChange).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('switch', { name: switchName }));
    await expect(args.onLocalNetworkAccessChange).toHaveBeenCalledOnce();
    await expect(args.onLocalNetworkAccessChange).toHaveBeenCalledWith(true);
  },
};

export const TurnsOffAndNoLongerSaysPairingIsUnavailable: Story = {
  args: { localNetworkAccess: { status: 'loaded', enabled: true } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.getByRole('switch', { name: switchName }),
    ).toBeChecked();
    await expect(canvas.queryByText(/Pairing is unavailable/)).toBeNull();
    await userEvent.click(canvas.getByRole('switch', { name: switchName }));
    await expect(args.onLocalNetworkAccessChange).toHaveBeenCalledOnce();
    await expect(args.onLocalNetworkAccessChange).toHaveBeenCalledWith(false);
  },
};

export const DisconnectedKeepsTheSwitchInactive: Story = {
  args: { localNetworkAccess: { status: 'disconnected' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('switch', { name: switchName }),
    ).toBeDisabled();
    await expect(canvas.getByText(/Connect to the Server/)).toBeVisible();
  },
};

export const RetriesLoading: Story = {
  args: { localNetworkAccess: { status: 'error' } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.getByRole('switch', { name: switchName }),
    ).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
