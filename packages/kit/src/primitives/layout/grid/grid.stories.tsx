import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Surface } from '#primitives/layout/surface';
import { Grid } from './grid';

const summaries = ['One', 'Two', 'Three', 'Four'];

const cells = summaries.map((title) => (
  <Surface key={title} kind="card" padding={4}>
    <Text>{title}</Text>
  </Surface>
));

const meta = {
  title: 'Design System/Primitives/Layout/Grid',
  component: Grid,
  argTypes: kitArgTypes('Grid'),
  args: { columns: 2, gap: 3, children: cells },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = { args: { columns: 2 } };

export const ThreeColumns: Story = { args: { columns: 3 } };

export const FourColumns: Story = { args: { columns: 4 } };

export const NarrowGap: Story = { args: { gap: 2 } };

export const WideGap: Story = { args: { gap: 4 } };

export const ColumnsPerSizeClass: Story = {
  args: { columns: { compact: 1, medium: 2, wide: 4 } },
  parameters: {
    docs: {
      description: {
        story: 'One column compact, two medium, four wide.',
      },
    },
  },
};
