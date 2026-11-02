import { settleLayout, layoutWidths } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { StoppedTurnCallout } from './stopped-turn-callout';

const meta = {
  title: 'Tests/Sessions/StoppedTurnCallout',
  component: StoppedTurnCallout,
  args: { reason: 'The Server restarted during this Turn', onRetry: fn() },
} satisfies Meta<typeof StoppedTurnCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

// Both widths draw it in place, never as a sheet over the Composer.
const retries = (width: number): Story => ({
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout(width);
    await expect(canvas.getByRole('alert')).toBeVisible();
    await expect(
      canvas.getByText('The Server restarted during this Turn'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
});

export const RetriesOnPhone = retries(layoutWidths.phone);

export const RetriesWide = retries(layoutWidths.wide);
