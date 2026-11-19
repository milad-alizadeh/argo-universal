import type { Argo } from '@argo/plugin-kit';
import { count, text, valueAt, type Json } from './json';
import { elapsed, mean } from './pace-metrics';
import type { Target } from './pace-search';
import { bodyOf, call } from './pull-reads';

type Job = { name: string; minutes: number };

export type Jobs = {
  count: number;
  average: number | null;
  longest: Job | null;
};

const invalid = 'GitHub returned incomplete job timings.';

function job(row: Json): Job {
  const start = Date.parse(text(row, invalid, 'started_at'));
  const end = Date.parse(text(row, invalid, 'completed_at'));

  return { name: text(row, invalid, 'name'), minutes: elapsed(start, end) };
}

export async function jobTimings(
  fetch: Argo['fetch'],
  target: Target,
  run: Json,
): Promise<Jobs> {
  const id = count(run, invalid, 'id');
  const path = `/repos/${target.repository}/actions/runs/${id}/attempts/1/jobs?per_page=100`;

  const body = await bodyOf(
    fetch,
    call(path, target.projectId),
    'Workflow jobs',
  );

  return timings(body);
}

function timings(body: string): Jobs {
  const jobs = valueAt(JSON.parse(body), ['jobs']);

  if (!Array.isArray(jobs)) throw new Error(invalid);

  const measured = jobs
    .filter((row) => valueAt(row, ['conclusion']) === 'success')
    .map(job);

  const longest = measured.sort((a, b) => b.minutes - a.minutes)[0] ?? null;

  return {
    count: measured.length,
    average: mean(measured.map((row) => row.minutes)),
    longest,
  };
}
