import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ControlledSegmentedControl } from './segmented-control-controlled';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/SegmentedControl',
  component: ControlledSegmentedControl,
  args: {
    label: 'Views',
    value: 'first',
    onValueChange: fn(),
    options: [
      { value: 'first', label: 'First' },
      { value: 'second', label: 'Second', disabled: true },
      { value: 'third', label: 'Third' },
    ],
  },
} satisfies Meta<typeof ControlledSegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChooseWithKeyboard: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'First' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    const third = canvas.getByRole('radio', { name: 'Third' });
    await expect(third).toBeChecked();
    await expect(third).toHaveFocus();
    await expect(args.onValueChange).toHaveBeenCalledWith('third');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'First' })).toBeChecked();
    await userEvent.keyboard('{End}{Home}');
    await expect(canvas.getByRole('radio', { name: 'First' })).toBeChecked();
  },
};

export const ChooseWithPointer: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Third' }));
    await expect(canvas.getByRole('radio', { name: 'Third' })).toBeChecked();
    await expect(args.onValueChange).toHaveBeenCalledWith('third');
    await expect(
      canvas.getByRole('radio', { name: 'First' }),
    ).not.toBeChecked();
  },
};

export const Unavailable: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent, args }) => {
    const first = canvas.getByRole('radio', { name: 'First' });
    await expect(first).toBeDisabled();
    await userEvent.click(first);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
