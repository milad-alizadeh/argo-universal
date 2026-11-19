import { Card, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Pace } from './pace-data';
import { duration } from './pace-metrics';

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

function measured(data: Pace): JSX.Element {
  return data.ci ? (
    timing(data.ci)
  ) : (
    <Text tone="muted">GitHub Actions timings unavailable.</Text>
  );
}

export function Workflows({ data }: { data: Pace }): JSX.Element {
  return (
    <Card
      title="GitHub Actions timing"
      subtitle="PR workflows created in the selected week"
    >
      <Stack direction="column" gap={2}>
        <Text role="control">{`Average PR time · ${duration(data.current.average)} (previously ${duration(data.previous.average)})`}</Text>
        {measured(data)}
      </Stack>
    </Card>
  );
}
