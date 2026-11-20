import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Switch } from './switch';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/Switch',
  component: Switch,
  args: { value: true, accessibilityLabel: 'Label', onValueChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IsASwitchNamedByItsLabel: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const toggle = canvas.getByRole('switch', { name: 'Label' });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await expect(args.onValueChange).toHaveBeenCalledWith(false);
  },
};
