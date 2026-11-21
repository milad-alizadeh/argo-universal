import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ColourWheel } from './colour-wheel';

const meta = {
  title: 'Design System/Primitives/Controls/ColourWheel',
  component: ColourWheel,
  argTypes: kitArgTypes('ColourWheel'),
  args: { accessibilityLabel: 'Colour' },
} satisfies Meta<typeof ColourWheel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};

export const Disabled: Story = { args: { disabled: true } };
