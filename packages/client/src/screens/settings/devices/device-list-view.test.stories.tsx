import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { DeviceListView } from './device-list-view';

const switchName = 'Local network access';

const pairButton = { name: 'Pair a Device' };

const meta = {
  title: 'Tests/Screens/Settings/Devices',
  component: DeviceListView,
  parameters: { screenPreview: true },
  args: {
    localNetworkAccess: { status: 'loaded', enabled: false },
    onLocalNetworkAccessChange: fn(),
    onPairDevice: fn(),
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
    await expect(canvas.getByRole('button', pairButton)).toBeDisabled();
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

export const OffersPairingOnceLocalNetworkAccessIsOn: Story = {
  args: { localNetworkAccess: { status: 'loaded', enabled: true } },
  play: async ({ canvas, args, userEvent }) => {
    const pair = canvas.getByRole('button', pairButton);

    await expect(pair).toBeEnabled();
    await userEvent.click(pair);
    await expect(args.onPairDevice).toHaveBeenCalledOnce();
  },
};

export const OffersPairingToNoBrowser: Story = {
  args: {
    localNetworkAccess: { status: 'loaded', enabled: true },
    pairingOffered: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', pairButton)).toBeDisabled();
    await expect(
      canvas.getByText(/Pairing is unavailable in a browser/),
    ).toBeVisible();
  },
};

const claimsOff = /Only this computer|Pairing is unavailable/;

export const DisconnectedClaimsNeitherState: Story = {
  args: { localNetworkAccess: { status: 'disconnected' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('switch')).toBeNull();
    await expect(canvas.queryByText(claimsOff)).toBeNull();
    await expect(canvas.getByText(/Connect to the Server/)).toBeVisible();
  },
};

export const LoadingClaimsNeitherState: Story = {
  args: { localNetworkAccess: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('switch')).toBeNull();
    await expect(canvas.queryByText(claimsOff)).toBeNull();
    await expect(
      canvas.getByText(/Loading Local network access/),
    ).toBeVisible();
  },
};

export const RetriesLoadingWithoutClaimingOff: Story = {
  args: { localNetworkAccess: { status: 'error' } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.queryByRole('switch')).toBeNull();
    await expect(canvas.queryByText(claimsOff)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
