import { Card, Grid, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { Trajectory, Distribution } from './pace-charts';
import type { Pace } from './pace-data';
import { dateOf, duration, type Merge } from './pace-metrics';

function metric(title: string, value: string, detail: string): JSX.Element {
  return (
    <Card title={title} density="compact">
      <Stack direction="column" gap={1}>
        <Text role="title">{value}</Text>
        <Text role="secondary" tone="muted">
          {detail}
        </Text>
      </Stack>
    </Card>
  );
}

function compared(
  title: string,
  current: string,
  previous: string,
): JSX.Element {
  return metric(title, current, `Previously ${previous}`);
}

function timed(
  data: Pace,
  key: 'median' | 'average',
  title: string,
): JSX.Element {
  return compared(
    title,
    duration(data.current[key]),
    duration(data.previous[key]),
  );
}

function openPulls(data: Pace): JSX.Element {
  return metric(
    'Open pull requests',
    String(data.open),
    `Drafts: ${data.drafts} · repository total now`,
  );
}

function Indicators({ data }: { data: Pace }): JSX.Element {
  const current = String(data.current.total);
  const prior = String(data.previous.total);

  return (
    <Grid columns={2} gap={3}>
      {compared('Merged PRs', current, prior)}
      {timed(data, 'average', 'Average open to merge')}
      {timed(data, 'median', 'Median open to merge')}
      {openPulls(data)}
    </Grid>
  );
}

function recent(title: string, merges: Merge[]): JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Text role="control">{title}</Text>
      {merges.map((pr) => (
        <Text
          key={pr.number}
        >{`${dateOf(pr.merged)} · #${pr.number}  ${pr.title}`}</Text>
      ))}
      {!merges.length && <Text tone="muted">No pull requests merged.</Text>}
    </Stack>
  );
}

function checkTiming(
  jobs: NonNullable<NonNullable<Pace['ci']>['jobs']>,
): JSX.Element {
  const job = jobs.longest;

  return (
    <Stack direction="column" gap={1}>
      <Text>{`Average check time · ${duration(jobs.average)}`}</Text>
      <Text tone="muted">{`${jobs.count} successful jobs among the first 100 in the latest sampled run.`}</Text>
      {job && (
        <Text>{`Longest check · ${job.name} · ${duration(job.minutes)}`}</Text>
      )}
    </Stack>
  );
}

function timing(ci: NonNullable<Pace['ci']>): JSX.Element {
  const jobs = ci.jobs;

  return (
    <Stack direction="column" gap={2}>
      <Text role="control">{`${duration(ci.total)} average elapsed · ${duration(ci.wait)} to start`}</Text>
      <Text tone="muted">{`${ci.count} first attempts among the latest 30 successful PR workflow runs. Elapsed includes the wait to start.`}</Text>
      {jobs && checkTiming(jobs)}
    </Stack>
  );
}

function Workflows({ data }: { data: Pace }): JSX.Element {
  const content = data.ci ? (
    timing(data.ci)
  ) : (
    <Text tone="muted">GitHub Actions timings unavailable.</Text>
  );

  return (
    <Card
      title="GitHub Actions timing"
      subtitle="PR workflows created in the selected week"
    >
      {content}
    </Card>
  );
}

function changes(data: Pace): JSX.Element {
  return (
    <Card
      title="What changed"
      subtitle="Latest merges into the default branch in each week"
    >
      <Stack direction="column" gap={4}>
        {recent('Previous week', data.previous.recent)}
        {recent('Selected week', data.current.recent)}
      </Stack>
    </Card>
  );
}

// A Card fills its parent. Give each chart its own content-sized column.
function section(body: JSX.Element): JSX.Element {
  return <Stack direction="column">{body}</Stack>;
}

export function PaceView({ data }: { data: Pace }): JSX.Element {
  const own = data.current.own;

  return (
    <Stack direction="column" gap={4}>
      {section(<Trajectory data={data} />)}
      {section(<Distribution data={data} />)}
      <Indicators data={data} />
      {section(<Workflows data={data} />)}
      {section(changes(data))}
      <Text role="secondary">{`Your contribution · ${own} of ${data.current.total} merged PRs authored by ${data.viewer}.`}</Text>
    </Stack>
  );
}
