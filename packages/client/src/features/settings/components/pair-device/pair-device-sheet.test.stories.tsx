import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PairDeviceSheet } from './pair-device-sheet';
import {
  expired,
  live,
  mintFailed,
  wantsToPair,
} from './pair-device-sheet-fixtures';

const typedCode = '7KQ4M-9XD2B';

const meta = {
  title: 'Tests/Settings/PairDeviceSheet',
  component: PairDeviceSheet,
  args: {
    ...live,
    onOpenChange: fn(),
    onNewCode: fn(),
    onAllow: fn(),
    onDecline: fn(),
  },
  // Pairing is offered on the Server Device's own desktop App, so every one of these runs at a wide window.
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof PairDeviceSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// The sheet draws into a portal, so its content is on the document rather than inside the story's canvas.
const sheet = within(document.body);

const qrCode = 'Pairing QR code';

// The sheet fades in, so each of these waits for its entrance before reading it or pressing anything in it.
const shown = async (text: RegExp | string): Promise<void> => {
  await sheet.findByText(text);
  await settleOverlays();
  await waitFor(() => expect(sheet.getByText(text)).toBeVisible());
};

export const ShowsTheCodeAndTheDigitsThatStandForIt: Story = {
  play: async () => {
    await shown(typedCode);
    await expect(sheet.getByLabelText(qrCode)).toBeVisible();
    await expect(sheet.getByText(/No camera\?/)).toBeVisible();
    await expect(sheet.queryByText(/has expired/)).toBeNull();
  },
};

// The code runs out, so the sheet says how long is left and how much of the Ticket's life that is.
export const CountsTheCodeDown: Story = {
  play: async () => {
    await shown(typedCode);
    await expect(sheet.getByText(/^\d:\d\d$/)).toBeVisible();
    await expect(sheet.getByText(/A new code appears/)).toBeVisible();

    const bar = sheet.getByRole('progressbar', {
      name: 'Time left on this code',
    });

    await expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  },
};

// Done is the way out of a sheet that is only read; it closes and grants nothing.
export const DoneClosesTheSheet: Story = {
  play: async ({ args, userEvent }) => {
    await shown(typedCode);
    await userEvent.click(sheet.getByRole('button', { name: 'Done' }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.onAllow).not.toHaveBeenCalled();
  },
};

export const AnExpiredCodeSaysSoAndOffersAnother: Story = {
  args: expired,
  play: async ({ args, userEvent }) => {
    await shown(/This code has expired/);
    await expect(sheet.queryByLabelText(qrCode)).toBeNull();
    await userEvent.click(sheet.getByRole('button', { name: 'New code' }));
    await expect(args.onNewCode).toHaveBeenCalledOnce();
  },
};

export const ACodeTheServerCouldNotGiveOffersAnother: Story = {
  args: mintFailed,
  play: async ({ args, userEvent }) => {
    await shown(/Could not get a code/);
    await userEvent.click(sheet.getByRole('button', { name: 'New code' }));
    await expect(args.onNewCode).toHaveBeenCalledOnce();
  },
};

export const NamesTheDeviceThatAskedAndAllowsIt: Story = {
  args: wantsToPair,
  play: async ({ args, userEvent }) => {
    await shown('iPhone 15 Pro wants to pair');
    await expect(sheet.queryByLabelText(qrCode)).toBeNull();
    await userEvent.click(sheet.getByRole('button', { name: 'Allow' }));
    await expect(args.onAllow).toHaveBeenCalledWith(wantsToPair.asking);
    await expect(args.onDecline).not.toHaveBeenCalled();
  },
};

export const DecliningTheDeviceAllowsNothing: Story = {
  args: wantsToPair,
  play: async ({ args, userEvent }) => {
    await shown('iPhone 15 Pro wants to pair');
    await userEvent.click(sheet.getByRole('button', { name: "Don't allow" }));
    await expect(args.onDecline).toHaveBeenCalledWith(wantsToPair.asking);
    await expect(args.onAllow).not.toHaveBeenCalled();
  },
};

export const AClosedSheetShowsNoCode: Story = {
  args: { open: false },
  play: async () => {
    await expect(sheet.queryByLabelText(qrCode)).toBeNull();
    await expect(sheet.queryByText(typedCode)).toBeNull();
  },
};
