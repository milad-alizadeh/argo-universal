import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import presentationMeta, { Disabled, Primary } from './icon-button.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Actions/IconButton',
};

export default meta;

type Story = StoryObj<typeof meta>;

const name = 'Favourite';

export const DisabledIgnoresPress: Story = {
  ...Disabled,
  args: { ...Disabled.args, onPress: fn() },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name });
    await expect(button).toBeDisabled();
    button.click();
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const Activation: Story = {
  ...Primary,
  args: { ...Primary.args, onPress: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};
