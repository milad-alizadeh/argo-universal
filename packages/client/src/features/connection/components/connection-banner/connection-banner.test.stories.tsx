import { eachLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ConnectionBanner } from './connection-banner';

const serverName = "Milad's Mac mini";

const meta = {
  title: 'Tests/Connection/ConnectionBanner',
  component: ConnectionBanner,
  args: { state: 'reconnecting', serverName, onRetry: fn() },
} satisfies Meta<typeof ConnectionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReconnectingHasNoAction: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('status')).toHaveTextContent(
        'Reconnecting…',
      );
      await expect(canvas.queryByRole('button')).toBeNull();
    }),
};

export const OfflineNamesTheServer: Story = {
  args: { state: 'offline' },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(await canvas.findByRole('status')).toHaveTextContent(
        `Can't reach ${serverName}`,
      );
    }),
};

export const OfflineBeforeTheServerNamedItself: Story = {
  args: { state: 'offline', serverName: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      "Can't reach the Server",
    );
  },
};

export const TryAgainRetries: Story = {
  args: { state: 'offline' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Try again' }),
    );
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const ShowsNothingWhileConnecting: Story = {
  args: { state: 'connecting' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

export const ShowsNothingWhileOpen: Story = {
  args: { state: 'open' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};
