import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { NotFoundView } from './not-found-view';

const meta = {
  title: 'Tests/Screens/Settings/NotFoundView',
  component: NotFoundView,
  parameters: { screenPreview: true },
  args: { serverName: 'Studio Server', onTryAgain: fn(), onScanAgain: fn() },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<typeof NotFoundView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TryAgainSendsTheTypedAddress: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Address' }),
      'studio-mac.local:4000',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onTryAgain).toHaveBeenCalledWith('studio-mac.local:4000');
  },
};

// With nothing typed, Try again looks again as before.
export const TryAgainWithNoAddress: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onTryAgain).toHaveBeenCalledWith('');
  },
};

export const ScanAgainLeavesTheAddress: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Scan again' }));
    await expect(args.onScanAgain).toHaveBeenCalledOnce();
    await expect(args.onTryAgain).not.toHaveBeenCalled();
  },
};
