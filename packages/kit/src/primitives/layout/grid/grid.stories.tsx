import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Grid } from './grid';
import {
  columnsPerSizeClassGrid,
  fourColumnsGrid,
  narrowGapGrid,
  threeColumnsGrid,
  twoColumnsGrid,
  wideGapGrid,
} from './grid-fixtures';

const meta = {
  title: 'Design System/Primitives/Layout/Grid',
  component: Grid,
  argTypes: kitArgTypes('Grid'),
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = { args: twoColumnsGrid };

export const ThreeColumns: Story = { args: threeColumnsGrid };

export const FourColumns: Story = { args: fourColumnsGrid };

export const NarrowGap: Story = { args: narrowGapGrid };

export const WideGap: Story = { args: wideGapGrid };

export const ColumnsPerSizeClass: Story = {
  args: columnsPerSizeClassGrid,
  parameters: {
    docs: {
      description: {
        story: 'One column compact, two medium, four wide.',
      },
    },
  },
};
