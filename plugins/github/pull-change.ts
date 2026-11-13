import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import { changeId } from './pull-reference';

// One Change as Argo's Changes Slot takes it (ADR-0052); the Slot's schema checks it again at the boundary.
export type ChangeItem = {
  id: string;
  stage: PullInfo['stage'];
  title: string;
  provider: 'github';
  repository: string;
  branch: string;
  base: string;
  head: string;
  pullRequest: { number: number; url: string };
  draft?: true;
  conflict?: true;
  totals: { files: number; additions: number; deletions: number };
  // Absent while the Checks are not known, which is never the same as passed.
  checks?: CheckInfo[];
  // Set when the latest read failed and the rest is what was last known.
  stale?: 'signIn' | 'failed';
};

// What a pull request's Change carries beside what GitHub said of the pull request itself.
export type Refresh = Pick<ChangeItem, 'checks' | 'stale'>;

const totalsOf = ({
  files,
  additions,
  deletions,
}: PullInfo): ChangeItem['totals'] => ({ files, additions, deletions });

// Draft and conflict can both hold, so each is its own fact.
const modifiersOf = ({
  draft,
  conflict,
}: PullInfo): Pick<ChangeItem, 'draft' | 'conflict'> => ({
  ...(draft && { draft: true as const }),
  ...(conflict && { conflict: true as const }),
});

// A pull request's identity is its repository plus number (ADR-0052).
export const changeOf = (
  pull: PullInfo,
  { checks, stale }: Refresh = {},
): ChangeItem => ({
  id: changeId(pull),
  stage: pull.stage,
  title: pull.title,
  provider: 'github',
  repository: pull.repository,
  branch: pull.branch,
  base: pull.base,
  head: pull.head,
  pullRequest: { number: pull.number, url: pull.url },
  ...modifiersOf(pull),
  totals: totalsOf(pull),
  ...(checks && { checks }),
  ...(stale && { stale }),
});
