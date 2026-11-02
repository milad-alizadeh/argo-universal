import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { PairPageView } from './pair-page-view';

// The wait is a card over the page, drawn in a portal.
const body = within(document.body);

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
  play: async ({ args, userEvent }) => {
    await userEvent.click(await body.findByRole('button', { name: 'Cancel' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

// The wait shows it is waiting, with a spinner in the card rather than silence.
export const WaitingShowsASpinner: Story = {
  args: { kind: 'waiting' },
  play: async () => {
    await expect(await body.findByRole('progressbar')).toBeVisible();
  },
};

// A page that names a computer says which one, so two Servers are never confused.
export const NamesTheServer: Story = {
  args: { kind: 'declined' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Studio PC/)).toBeVisible();
  },
};

// A typed code's expired page leads back to typing, not to a camera.
export const TypedCodeOffersANewCode: Story = {
  args: { way: 'type' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Scan again' }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Type a new code' }),
    );
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};
