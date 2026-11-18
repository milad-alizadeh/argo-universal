import { Grid, Stack, Surface, Svg, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  heading,
  note,
  panel,
  rule,
  minutes,
  trajectory,
  distribution,
} from './pace-charts';
import type { Pace } from './pace-data';
import type { Merge, Week } from './pace-metrics';
import type { Lane } from './pace-milestones';
import { Workflows } from './pace-timing';

const date = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const figureWidth = 120;

function metric(title: string, value: string, detail: string): JSX.Element {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 38"><text x="0" y="31" fill="currentColor" font-family="sans-serif" font-size="31" font-weight="bold">${value}</text></svg>`;

  return (
    <Surface kind="card" padding={4}>
      <Stack direction="column" gap={1}>
        {note(title)}
        <Svg width={figureWidth} xml={xml} label={value} />
        {note(detail)}
      </Stack>
    </Surface>
  );
}

const columns = { compact: 1, medium: 3, wide: 3 };

const previousValue = (value: string): string => `Previously ${value}`;

function mergedCard({ current, previous, branch }: Pace): JSX.Element {
  return metric(
    `Merged to ${branch}`,
    String(current.total),
    previousValue(String(previous.total)),
  );
}

function medianCard({ current, previous }: Pace): JSX.Element {
  return metric(
    'Median open to merge',
    minutes(current.median),
    previousValue(minutes(previous.median)),
  );
}

function openCard(data: Pace): JSX.Element {
  return metric(
    'Open pull requests',
    String(data.open),
    `Including drafts · ${data.drafts}`,
  );
}

function indicators(data: Pace): JSX.Element {
  return (
    <Grid columns={columns} gap={3}>
      {mergedCard(data)}
      {medianCard(data)}
      {openCard(data)}
    </Grid>
  );
}

function event(
  pr: Pick<Merge, 'title' | 'number' | 'merged'>,
  prefix = '',
): JSX.Element {
  return (
    <Stack direction="column" gap={1}>
      {note(`${prefix}${date.format(pr.merged)} · #${pr.number}`)}
      <Text role="control">{pr.title}</Text>
    </Stack>
  );
}

function lane(row: Lane): JSX.Element {
  return (
    <Stack key={row.name} direction="column" gap={2}>
      <Text role="control">{row.name}</Text>
      <Grid columns={2} gap={4}>
        {event(row.first)}
        {event(row.last, '→ ')}
      </Grid>
    </Stack>
  );
}

function recent(week: Week): JSX.Element {
  return panel(
    <Stack direction="column" gap={3}>
      {heading('Recent changes')}
      {week.recent.map((pr) => (
        <Stack key={pr.number} direction="column">
          {event(pr)}
        </Stack>
      ))}
      {!week.total && note('No pull requests merged.')}
    </Stack>,
  );
}

function changes(week: Week): JSX.Element {
  if (!week.lanes.length) return recent(week);

  return panel(
    <Stack direction="column" gap={3}>
      {heading('How capabilities evolved')}
      {week.lanes.map((row, i) => (
        <Stack key={row.name} direction="column" gap={3}>
          {i > 0 && rule()}
          {lane(row)}
        </Stack>
      ))}
    </Stack>,
  );
}

type Props = { data: Pace; partial: boolean };

export function PaceView({ data, partial }: Props): JSX.Element {
  const { current } = data;
  const credit = `Your contribution · ${current.own} of ${current.total} merged PRs authored by ${data.viewer}. Prior period: ${data.prior}.`;

  return (
    <Stack direction="column" gap={3}>
      {trajectory(data, partial)}
      {distribution(current)}
      {indicators(data)}
      {changes(current)}
      {note(credit)}
      <Workflows data={data} />
    </Stack>
  );
}
