import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './button';

const onPress = fn();
const onActivate = fn();
const meta = { title: 'Tests/Button' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => <Button label="Save changes" loading onPress={onPress} />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.getByText('Save changes')).toBeVisible();
    button.click();
    await expect(onPress).not.toHaveBeenCalled();
  },
};

export const Activation: Story = {
  render: () => <Button label="Continue" onPress={onActivate} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(onActivate).toHaveBeenCalledOnce();
  },
};
