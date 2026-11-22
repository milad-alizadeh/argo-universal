import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { GradientTile } from './gradient-tile';
import previewStops from './gradient-tile-fixture.json';

const meta = {
  title: 'Tests/Design System/Primitives/Layout/GradientTile',
  component: GradientTile,
  args: { title: 'Sunset', fill: previewStops, selected: true, onPress: fn() },
} satisfies Meta<typeof GradientTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SelectionRingDoesNotInsetTheFill: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const tile = canvas.getByRole('button', { name: 'Sunset', pressed: true });
    const bounds = tile.getBoundingClientRect();
    const fill = tile.querySelector('svg');

    await expect(fill).toBeInTheDocument();
    await expect(fill?.getBoundingClientRect().width).toBe(bounds.width);
    await expect(fill?.getBoundingClientRect().height).toBe(bounds.height);

    await userEvent.click(tile);
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};
