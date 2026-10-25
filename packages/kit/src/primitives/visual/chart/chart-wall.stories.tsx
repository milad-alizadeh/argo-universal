import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Chart, type ChartProps } from './chart';
import {
  areaChart,
  barChart,
  donutChart,
  lineChart,
  stackedBarChart,
} from './chart-fixtures';

const meta = {
  title: 'Design System/Primitives/Visual/Chart/Wall',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const kinds = [lineChart, barChart, areaChart, stackedBarChart, donutChart];

const tileCount = 60;

interface Tile {
  id: string;
  chart: ChartProps;
}

const tiles: Tile[] = Array.from({ length: tileCount }, (_, index) => ({
  id: String(index),
  chart: kinds[index % kinds.length] ?? lineChart,
}));

function tileKey(tile: Tile): string {
  return tile.id;
}

function ChartTile(tile: Tile): React.JSX.Element {
  return (
    <ListItem
      title={`Metric ${tile.id}`}
      media={<Chart {...tile.chart} label={`Metric ${tile.id}`} />}
    />
  );
}

// The smooth-scroll check: more tiles than the drawing budget, so scrolling hands drawings between cells.
export const Wall: Story = {
  render: () => (
    <List
      layout="grid"
      columns="auto"
      tileSize="sm"
      aspect="landscape"
      items={tiles}
      keyExtractor={tileKey}
      renderItem={ChartTile}
    />
  ),
};
