import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Swatch } from './swatch';
import { emptySwatch, gradientSwatch, solidSwatch } from './swatch-fixtures';

const meta = {
  title: 'Design System/Primitives/Visual/Swatch',
  component: Swatch,
  argTypes: kitArgTypes('Swatch'),
} satisfies Meta<typeof Swatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Solid: Story = { args: solidSwatch };

export const Gradient: Story = { args: gradientSwatch };

export const Empty: Story = { args: emptySwatch };
