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
    await expect(canvas.getByRole('button', { name: 'First' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    const third = canvas.getByRole('button', { name: 'Third' });
    await expect(third).toHaveAttribute('aria-pressed', 'true');
    await expect(third).toHaveFocus();
    await expect(args.onValueChange).toHaveBeenCalledWith('third');
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'First' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.keyboard('{End}{Home}');
    await expect(canvas.getByRole('button', { name: 'First' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

export const ChooseWithPointer: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Third' }));
    await expect(canvas.getByRole('button', { name: 'Third' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(args.onValueChange).toHaveBeenCalledWith('third');
    await expect(canvas.getByRole('button', { name: 'First' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};

export const Unavailable: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent, args }) => {
    const first = canvas.getByRole('button', { name: 'First' });
    await expect(first).toBeDisabled();
    await userEvent.click(first);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
