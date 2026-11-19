import type { Argo } from '@argo/plugin-kit';
import { valueAt, text, type Json } from './json';
import { jobTimings, type Jobs } from './pace-jobs';
import { dateOf, days, dayMs, elapsed, mean } from './pace-metrics';
import type { Target } from './pace-search';
import { bodyOf, call } from './pull-reads';

type Timing = { wait: number; total: number };

export type Workflows = {
  count: number;
  wait: number | null;
  total: number | null;
  jobs: Jobs | null;
};

const invalid = 'GitHub returned incomplete workflow timings.';

const sampleSize = 30;

function timing(run: Json): Timing {
  const stamp = (field: string): number =>
    Date.parse(text(run, invalid, field));

  return {
    wait: elapsed(stamp('created_at'), stamp('run_started_at')),
    total: elapsed(stamp('created_at'), stamp('updated_at')),
  };
}

function attempts(body: string): Json[] {
  const runs = valueAt(JSON.parse(body), ['workflow_runs']);

  if (!Array.isArray(runs)) throw new Error(invalid);

  return runs.filter((run) => valueAt(run, ['run_attempt']) === 1);
}

function sample(runs: Json[], jobs: Jobs | null): Workflows {
  const times = runs.map(timing);

  return {
    jobs,
    count: times.length,
    wait: mean(times.map((row) => row.wait)),
    total: mean(times.map((row) => row.total)),
  };
}

// GitHub Actions lists the newest successful runs first. A rerun's updated timestamp belongs to another attempt.
export async function readWorkflows(
  fetch: Argo['fetch'],
  target: Target,
): Promise<Workflows> {
  const end = dateOf(target.start + (days - 1) * dayMs);
  const range = `${dateOf(target.start)}..${end}`;
  const path = `/repos/${target.repository}/actions/runs?event=pull_request&status=success&created=${range}&per_page=${sampleSize}`;

  const runs = attempts(
    await bodyOf(fetch, call(path, target.projectId), 'GitHub Actions'),
  );

  const jobs = runs[0]
    ? await jobTimings(fetch, target, runs[0]).catch(() => null)
    : null;

  return sample(runs, jobs);
}
