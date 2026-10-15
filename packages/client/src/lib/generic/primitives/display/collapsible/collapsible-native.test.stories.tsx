import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import * as Native from './collapsible.native';

const meta = {
  title: 'Tests/CollapsibleNative',
  component: Native.Collapsible,
  args: { onOpenChange: fn() },
} satisfies Meta<typeof Native.Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderOwnsToggle: Story = {
  render: (args) => (
    <Native.Collapsible onOpenChange={args.onOpenChange}>
      <Native.CollapsibleHeader label="Read files" icon="read" />
    </Native.Collapsible>
  ),
  play: async ({ canvas, userEvent, args }) => {
    const header = canvas.getByRole('button', { name: 'Read files' });
    await userEvent.click(header);
    await expect(args.onOpenChange).toHaveBeenNthCalledWith(1, true);
    await userEvent.click(header);
    await expect(args.onOpenChange).toHaveBeenNthCalledWith(2, false);
    await expect(args.onOpenChange).toHaveBeenCalledTimes(2);
  },
};
