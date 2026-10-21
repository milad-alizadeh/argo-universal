import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from '#primitives/content/text';
import { Surface } from '#primitives/layout/surface';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Grid, type GridProps } from './grid';

const meta = {
  title: 'Design System/Primitives/Layout/Grid',
  component: Grid,
  argTypes: kitArgTypes('Grid'),
  args: { columns: 2 },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

const summaries = ['One', 'Two', 'Three', 'Four'];

function SummaryGrid(props: Omit<GridProps, 'children'>): React.JSX.Element {
  return (
    <Grid {...props}>
      {summaries.map((title) => (
        <Surface key={title} kind="card" padding={4}>
          <Text>{title}</Text>
        </Surface>
      ))}
    </Grid>
  );
}

export const Variations: Story = {
  name: 'Grid',
  render: () => (
    <VariationList>
      {([2, 3, 4] as const).map(columnVariation)}
      {([2, 3, 4] as const).map(gapVariation)}
      <Variation label="Size class">
        <SummaryGrid columns={{ compact: 1, medium: 2, wide: 4 }} gap={3} />
      </Variation>
    </VariationList>
  ),
};

function columnVariation(columns: number): React.JSX.Element {
  return (
    <Variation key={columns} label={`${columns} columns`}>
      <SummaryGrid columns={columns} gap={3} />
    </Variation>
  );
}

function gapVariation(gap: 2 | 3 | 4): React.JSX.Element {
  return (
    <Variation key={gap} label={`Gap ${gap}`}>
      <SummaryGrid columns={2} gap={gap} />
    </Variation>
  );
}
