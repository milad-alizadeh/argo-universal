import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PairPageView } from './pair-page-view';

const meta = {
  title: 'Tests/Screens/Settings/PairPageView',
  component: PairPageView,
  parameters: { screenPreview: true },
  args: {
    kind: 'expired',
    serverName: 'Studio PC',
    onAction: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<typeof PairPageView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OffersTheWayOn: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Scan again' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

// The wait has nothing to retry, so its one action is Cancel.
export const WaitingOffersCancel: Story = {
  args: { kind: 'waiting' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

// A page that names a computer says which one, so two Servers are never confused.
export const NamesTheServer: Story = {
  args: { kind: 'declined' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Studio PC/)).toBeVisible();
  },
};
