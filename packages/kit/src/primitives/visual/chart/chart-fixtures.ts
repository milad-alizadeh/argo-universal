import { chartProps } from '@repo/contracts/plugins/visual-props';
import fixtures from '@repo/mocks/plugins/chart.json' with { type: 'json' };
import type { ChartProps } from './chart';

// One Plugin-shaped chart per kind, shared with the registry story and the Server's validation test.
const drawnProps = chartProps.omit({ onPress: true });

const chart = (name: keyof typeof fixtures): ChartProps =>
  drawnProps.parse(fixtures[name]);

export const lineChart = chart('line');

// A chart has no gridlines unless it asks for them.
export const gridlinesLineChart = { ...lineChart, grid: true };

export const barChart = chart('bar');

export const groupedBarChart = chart('groupedBar');

export const stackedBarChart = chart('stackedBar');

export const areaChart = chart('area');

export const stackedAreaChart = chart('stackedArea');

export const scatterChart = chart('scatter');

export const pieChart = chart('pie');

export const donutChart = chart('donut');
