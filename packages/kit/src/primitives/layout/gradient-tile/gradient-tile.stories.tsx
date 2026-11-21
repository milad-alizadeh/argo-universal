import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { GradientTile } from './gradient-tile';

const meta = {
  title: 'Design System/Primitives/Layout/Gradient Tile',
  component: GradientTile,
  argTypes: kitArgTypes('GradientTile'),
  args: {
    title: 'Sunset',
    fill: ['#FFA34F', '#AC74EE'],
    onPress: fn(),
  },
} satisfies Meta<typeof GradientTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };
