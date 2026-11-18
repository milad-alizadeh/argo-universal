import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { LocalNetworkView } from './local-network-view';

const meta = {
  title: 'Tests/Screens/Settings/LocalNetworkView',
  component: LocalNetworkView,
  parameters: { screenPreview: true },
  args: {
    kind: 'denied',
    serverName: 'Studio Server',
    onOpenSettings: fn(),
    onBack: fn(),
    onTryAgain: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<typeof LocalNetworkView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OffOpensSettingsOrGoesBack: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Settings' }),
    );
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Servers' }),
    );
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(canvas.getByText(/Studio Server/)).toBeVisible();
  },
};

// A build that cannot browse has no setting to open: back is its only way on.
export const MisconfiguredOffersOnlyBack: Story = {
  args: { kind: 'misconfigured' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByText(/_argo\._tcp/)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Servers' }),
    );
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

export const UndeterminedShowsItIsWaiting: Story = {
  args: { kind: 'undetermined' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(await canvas.findByRole('progressbar')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onTryAgain).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Settings' }),
    );
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
  },
};
