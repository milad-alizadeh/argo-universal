import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { LoadError } from './LoadError';

const meta = {
  title: 'Tests/LoadError',
  component: LoadError,
  args: {
    title: "Couldn't load Sessions",
    description:
      "The Server didn't respond. Check that it's running, then retry.",
    onRetry: fn(),
  },
} satisfies Meta<typeof LoadError>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RetryCallsOnRetry: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText("Couldn't load Sessions")).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
