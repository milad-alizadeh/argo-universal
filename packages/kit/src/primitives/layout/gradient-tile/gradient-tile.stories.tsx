import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { GradientTile } from './gradient-tile';
import previewStops from './gradient-tile-fixture.json';

const meta = {
  title: 'Design System/Primitives/Layout/GradientTile',
  component: GradientTile,
  argTypes: kitArgTypes('GradientTile'),
  args: {
    title: 'Sunset',
    fill: previewStops,
    onPress: fn(),
  },
} satisfies Meta<typeof GradientTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const Pressed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.pointer({
      target: canvas.getByRole('button', { name: 'Sunset' }),
      keys: '[MouseLeft>]',
    });
  },
};
