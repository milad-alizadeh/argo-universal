import { Spacer, Stack, Surface, Svg, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { period, type Pace } from './pace-data';
import { bucketNames, days, dayMs, type Week } from './pace-metrics';
import { Plot } from './pace-plot';

const weekday = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  timeZone: 'UTC',
});

export function panel(children: JSX.Element): JSX.Element {
  return (
    <Surface kind="card" padding={5}>
      {children}
    </Surface>
  );
}

function edges(left: JSX.Element, right: JSX.Element): JSX.Element {
  return (
    <Stack direction="row" align="center" gap={2}>
      {left}
      <Spacer />
      {right}
    </Stack>
  );
}

export const note = (label: string): JSX.Element => (
  <Text role="secondary" tone="muted">
    {label}
  </Text>
);

export const heading = (label: string): JSX.Element => (
  <Text role="title">{label}</Text>
);

function key(label: string, tone: 'info' | 'muted'): JSX.Element {
  return (
    <Stack direction="row" gap={1} align="center">
      <Text tone={tone}>●</Text>
      <Text role="control" tone={tone === 'info' ? 'neutral' : 'muted'}>
        {label}
      </Text>
    </Stack>
  );
}

function legend(data: Pace): JSX.Element {
  return (
    <Stack direction="row" gap={3}>
      {key(`${period(data.target.start)} · ${data.current.total}`, 'info')}
      {key(`${data.prior} · ${data.previous.total}`, 'muted')}
    </Stack>
  );
}

function bounds(start: number, partial: boolean): JSX.Element {
  const end = weekday.format(start + (days - 1) * dayMs);

  return edges(
    note(weekday.format(start)),
    note(partial ? `${end} · partial` : end),
  );
}

const chartTitle = 'Cumulative merges';

const alignment = 'By weekday';

export function trajectory(data: Pace, partial: boolean): JSX.Element {
  const title = edges(heading(chartTitle), note(alignment));
  const caption = `Each point is the running total of PRs merged into ${data.branch}.`;

  return panel(
    <Stack direction="column" gap={3}>
      {title}
      {legend(data)}
      <Plot data={data} />
      {bounds(data.target.start, partial)}
      {note(caption)}
    </Stack>,
  );
}

const barShare = 54;

const rowRatio = 21;

function bucket(name: string, count: number, max: number): JSX.Element {
  const share = (barShare * count) / max;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="68%" font-family="sans-serif" font-size="13" fill="currentColor">${name}</text><rect x="32%" y="18%" width="${share}%" height="60%" rx="3" fill="currentColor" opacity=".83"/><text x="98%" y="68%" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="end" fill="currentColor">${count}</text></svg>`;

  return (
    <Svg
      tone="done"
      key={name}
      xml={xml}
      label={`${name}, ${count} pull requests`}
      aspectRatio={rowRatio}
    />
  );
}

const hourMinutes = 60;

export const minutes = (n: number | null): string =>
  n === null ? '—' : `${Math.round(n)} min`;

function summary(week: Week): JSX.Element {
  const tail =
    week.p90 === null ? '—' : `${(week.p90 / hourMinutes).toFixed(1)} hr`;

  return edges(
    <Text role="control">{`Median · ${minutes(week.median)}`}</Text>,
    <Text role="control">{`90th percentile · ${tail}`}</Text>,
  );
}

function histogram(week: Week): JSX.Element {
  const max = Math.max(1, ...week.bins);

  const rows = bucketNames.map((label, i) =>
    bucket(label, week.bins[i] ?? 0, max),
  );

  return (
    <Stack direction="column" gap={1}>
      {rows}
    </Stack>
  );
}

export function distribution(week: Week): JSX.Element {
  const caption = `Elapsed time from opening to merge · ${week.total} merged pull requests`;

  return panel(
    <Stack direction="column" gap={3}>
      {heading('How long PRs stayed open')}
      {note(caption)}
      {histogram(week)}
      {rule()}
      {summary(week)}
    </Stack>,
  );
}

export function rule(): JSX.Element {
  const xml =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 1"><path d="M0 .5H500" stroke="currentColor" opacity=".35"/></svg>';

  return <Svg xml={xml} tone="muted" label="Section divider" />;
}
