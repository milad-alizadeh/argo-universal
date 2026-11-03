import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Metadata } from './metadata';
import { FallbackBoard } from './metadata-fallback-options.mocks';

/*
 * #1860 options, for the owner to pick from: what Metadata draws when its 280 column does not fit. Each story is one
 * option at the 375, 768 and 1024 windows side by side, with the Issue tracker's real fields. Nothing here is built.
 */
const meta = {
  title: 'Design System/Primitives/Scaffolds/Metadata/FallbackOptions',
  component: Metadata,
  argTypes: kitArgTypes('Metadata'),
} satisfies Meta<typeof Metadata>;

export default meta;

type Story = StoryObj<typeof meta>;

// Today: one inline line, where a long value squeezes its label to nothing and runs past the edge.
export const Current: Story = {
  render: () => <FallbackBoard title="Current: inline line" />,
};

// A: label over value, as the 280 column already draws, at every width.
export const AStacked: Story = {
  render: () => <FallbackBoard title="A · Stacked" option="stacked" />,
};

// B: a fixed label column that truncates, the value beside it wrapping.
export const BLabelColumn: Story = {
  render: () => (
    <FallbackBoard title="B · Label column" option="label-column" />
  ),
};

// C: the inline line kept, with labels that never shrink and values that wrap under their label.
export const CWrapBelow: Story = {
  render: () => <FallbackBoard title="C · Inline, wrap below" option="wrap" />,
};

// D: iOS's beside drawing on the web: label leading, value trailing.
export const DBeside: Story = {
  render: () => <FallbackBoard title="D · Beside (as iOS)" option="beside" />,
};
