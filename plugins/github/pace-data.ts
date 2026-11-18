import type { Argo } from '@argo/plugin-kit';
import { dateOf, days, dayMs, summarize, type Week } from './pace-metrics';
import {
  readMerges,
  readOverview,
  type Overview,
  type Target,
} from './pace-search';
import { readWorkflows, type Workflows } from './pace-workflows';

function searchRange(start: number): string {
  return `${dateOf(start)} – ${dateOf(start + (days - 1) * dayMs)}`;
}

const displayDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function period(start: number): string {
  return displayDate.formatRange(
    new Date(start),
    new Date(start + (days - 1) * dayMs),
  );
}

async function week(
  fetch: Argo['fetch'],
  target: Target,
  { branch, viewer }: Overview,
): Promise<Week> {
  const range = searchRange(target.start).replace(' – ', '..');
  const base = branch.replaceAll(/["\\]/g, '\\$&');
  const search = `repo:${target.repository} is:pr is:merged base:"${base}" merged:${range}`;

  const pulls = await readMerges(fetch, target, search);

  return summarize(pulls, target.start, viewer);
}

export type Pace = Overview & {
  target: Target;
  current: Week;
  previous: Week;
  ci: Workflows | null;
  prior: string;
  snapshot: number;
};

export async function paceData(
  fetch: Argo['fetch'],
  target: Target,
): Promise<Pace> {
  const info = await readOverview(fetch, target);
  const prior = { ...target, start: target.start - days * dayMs };

  const [current, previous, ci] = await Promise.all([
    week(fetch, target, info),
    week(fetch, prior, info),
    readWorkflows(fetch, target).catch(() => null),
  ]);

  const window = { target, prior: period(prior.start), snapshot: Date.now() };

  return { ...info, ...window, current, previous, ci };
}
