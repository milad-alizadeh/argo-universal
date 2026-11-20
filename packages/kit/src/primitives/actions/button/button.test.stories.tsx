import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import presentationMeta, { Disabled, LeadingIcon } from './button.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Actions/Button',
};

export default meta;

type Story = StoryObj<typeof meta>;

export const DisabledIgnoresPress: Story = {
  ...Disabled,
  args: { ...Disabled.args, onPress: fn() },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' });
    await expect(button).toBeDisabled();
    button.click();
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const LeadingIconContents: Story = {
  ...LeadingIcon,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Add' })).toBeVisible();
  },
};

export const Activation: Story = {
  args: { label: 'Continue', onPress: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};
