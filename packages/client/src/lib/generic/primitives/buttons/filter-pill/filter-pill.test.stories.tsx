import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { FilterPill } from './filter-pill';

const meta = {
  title: 'Tests/FilterPill',
  component: FilterPill,
  args: { label: 'Open', value: false, onValueChange: fn() },
} satisfies Meta<typeof FilterPill>;

export default meta;

type Story = StoryObj<typeof meta>;

// A filter says its count with its name.
export const SaysCount: Story = {
  args: { count: 12 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Open, 12' }),
    ).toBeInTheDocument();
  },
};

// An off filter says so, and turns on.
export const TurnsOn: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const pill = canvas.getByRole('button', { name: 'Open' });

    await expect(pill).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pill);
    await expect(args.onValueChange).toHaveBeenCalledWith(true);
  },
};

// An on filter says so, and turns off.
export const TurnsOff: Story = {
  args: { value: true },
  play: async ({ canvas, userEvent, args }) => {
    const pill = canvas.getByRole('button', { name: 'Open' });

    await expect(pill).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pill);
    await expect(args.onValueChange).toHaveBeenCalledWith(false);
  },
};

// A disabled filter keeps its state and takes no focus.
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('button', { name: 'Open' })).toBeDisabled();
    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Open' }),
    ).not.toHaveFocus();
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
