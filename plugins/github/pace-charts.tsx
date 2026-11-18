import { Card, Chart, Svg, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { period, type Pace } from './pace-data';
import { bucketNames, duration } from './pace-metrics';

function lineChart(data: Pace): JSX.Element {
  return (
    <Chart
      label="Cumulative merged pull requests by day"
      kind="line"
      grid
      series={[
        { name: 'Selected week', tone: 'info', points: data.current.points },
        { name: 'Previous week', tone: 'muted', points: data.previous.points },
      ]}
    />
  );
}

export function Trajectory({ data }: { data: Pace }): JSX.Element {
  const { current, previous, target, prior } = data;

  return (
    <Card
      title="Cumulative merges"
      subtitle={`PRs merged into ${data.branch} · days 1–7, UTC`}
    >
      <Stack direction="column" gap={2}>
        <Text tone="info">{`${period(target.start)} · ${current.total} merged`}</Text>
        <Text tone="muted">{`${prior} · ${previous.total} merged`}</Text>
        {lineChart(data)}
      </Stack>
    </Card>
  );
}

const barWidth = 500;

const barHeight = 8;

function bar(count: number, max: number, label: string): JSX.Element {
  const width = (barWidth * count) / max;
  const xml = `<svg viewBox="0 0 ${barWidth} ${barHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${barHeight}" rx="3" fill="currentColor"/></svg>`;

  return (
    <Svg
      xml={xml}
      label={label}
      tone="done"
      aspectRatio={barWidth / barHeight}
    />
  );
}

function bucket(name: string, count: number, max: number): JSX.Element {
  const label = `${name} · ${count} PRs`;

  return (
    <Stack key={name} direction="column" gap={1}>
      <Text role="secondary">{label}</Text>
      {bar(count, max, label)}
    </Stack>
  );
}

function bucketBars(bins: number[]): JSX.Element[] {
  return bucketNames.map((name, i) =>
    bucket(name, bins[i] ?? 0, Math.max(1, ...bins)),
  );
}

export function Distribution({ data }: { data: Pace }): JSX.Element {
  const { bins, total, median, p90 } = data.current;

  const bars = bucketBars(bins);

  return (
    <Card
      title="How long PRs stayed open"
      subtitle={`Opening to merge · ${total} merged pull requests`}
    >
      <Stack direction="column" gap={3}>
        {bars}
        <Text role="secondary">{`Median ${duration(median)} · 90th percentile ${duration(p90)}`}</Text>
      </Stack>
    </Card>
  );
}
