import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Svg } from './svg';
import { drawingUnavailableSvg, infoSvg, sizedSvg } from './svg-fixtures';

const meta = {
  title: 'Design System/Primitives/Visual/Svg',
  component: Svg,
  argTypes: kitArgTypes('Svg'),
} satisfies Meta<typeof Svg>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = { args: infoSvg };

// A set width draws the artwork at that size instead of the width it is given.
export const Sized: Story = { args: sizedSvg };

export const DrawingUnavailable: Story = {
  args: drawingUnavailableSvg,
  parameters: {
    docs: {
      description: {
        story: 'Markup the renderer cannot draw falls back to the label.',
      },
    },
  },
};
