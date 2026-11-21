import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { GradientTile } from './gradient-tile';

const meta = {
  title: 'Design System/Primitives/Layout/Gradient Tile',
  component: GradientTile,
  args: {
    title: 'Sunset',
    fill: ['var(--color-warning)', 'var(--color-info)'],
    onPress: fn(),
  },
} satisfies Meta<typeof GradientTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };
