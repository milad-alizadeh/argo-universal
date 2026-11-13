import type { Change } from '@repo/contracts';
import type {
  ChangeState,
  CheckDetail,
  SessionPullRequest,
} from '#features/sessions';
import type { SlotReading } from './slot-items';

type PullRequestChange = Change & {
  pullRequest: NonNullable<Change['pullRequest']>;
};

type Check = NonNullable<Change['checks']>[number];

const hasPullRequest = (change: Change): change is PullRequestChange =>
  change.pullRequest !== undefined;

// Draft and conflict are separate facts, so a Change that has both keeps both.
const modifiersOf = ({ conflict, draft }: Change): ('conflict' | 'draft')[] => [
  ...(draft ? (['draft'] as const) : []),
  ...(conflict ? (['conflict'] as const) : []),
];

// The mark a Change draws on its own: a conflict is what blocks it, so it shows ahead of draft.
const markOf = ({
  conflict,
  draft,
}: Change): 'conflict' | 'draft' | undefined => {
  if (conflict) return 'conflict';

  return draft ? 'draft' : undefined;
};

const stateOf = (change: Change): ChangeState => {
  const modifier = markOf(change);

  if (change.stage !== 'open') return { stage: change.stage };

  return modifier
    ? { stage: 'open', modifier, modifiers: modifiersOf(change) }
    : { stage: 'open' };
};

// The branches GitHub named, where it did, and the commit the PR's head is at.
const branchesOf = ({
  branch,
  base,
  head,
}: Change): Pick<SessionPullRequest, 'branch' | 'base' | 'head'> => ({
  ...(branch && { branch }),
  ...(base && { base }),
  ...(head && { head }),
});

const detailOf = ({ name, state }: Check): CheckDetail => ({
  name,
  state: state === 'failed' ? 'failing' : state,
});

const countOf = (checks: readonly Check[], state: Check['state']): number =>
  checks.filter((check) => check.state === state).length;

/*
 * The Checks the Change carries, counted. Checks that are not known, or that the code host says there are none of,
 * leave nothing to draw: they are never drawn as passed.
 */
const checksOf = ({ checks }: Change): Pick<SessionPullRequest, 'checks'> => {
  if (!checks?.length) return {};

  return {
    checks: {
      passed: countOf(checks, 'passed'),
      failing: countOf(checks, 'failed'),
      running: countOf(checks, 'running'),
      total: checks.length,
      details: checks.map(detailOf),
    },
  };
};

/*
 * What the Plugin said that the Change's one drawn modifier cannot show: both draft and conflict, and that the latest
 * refresh failed. The data is kept for the views that draw them.
 */
const flagsOf = ({
  draft,
  conflict,
}: Change): Pick<SessionPullRequest, 'draft' | 'conflict'> => ({
  ...(draft && { draft: true }),
  ...(conflict && { conflict: true }),
});

const staleOf = ({ stale }: Change): Pick<SessionPullRequest, 'stale'> =>
  stale ? { stale } : {};

const factsOf = (
  change: Change,
): Pick<SessionPullRequest, 'draft' | 'conflict' | 'stale'> => ({
  ...flagsOf(change),
  ...staleOf(change),
});

const pullRequestOf = (change: PullRequestChange): SessionPullRequest => ({
  ...stateOf(change),
  ...branchesOf(change),
  id: change.id,
  repository: change.repository,
  url: change.pullRequest.url,
  number: change.pullRequest.number,
  title: change.title,
  mergeable: !change.conflict,
  ...(change.totals && { summary: change.totals }),
  ...checksOf(change),
  ...factsOf(change),
});

/*
 * The Changes the Plugins supplied for one Session, as the Workbench and Inspector draw them, in the order the
 * Plugins gave them. A Change with no PR number has nothing to draw as one: local Working and Branch Changes come from
 * the Checkout, so they are not repeated here (ADR-0052).
 */
export function sessionPullRequests(
  reading: SlotReading<Change>,
): SessionPullRequest[] {
  return [...reading.items, ...reading.overflow].flatMap(({ item }) =>
    hasPullRequest(item) ? [pullRequestOf(item)] : [],
  );
}
