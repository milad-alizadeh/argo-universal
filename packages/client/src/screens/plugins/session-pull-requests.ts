import type { Change } from '@repo/contracts';
import type { ChangeState, SessionPullRequest } from '#features/sessions';
import type { SlotReading } from './slot-items';

type PullRequestChange = Change & {
  pullRequest: NonNullable<Change['pullRequest']>;
};

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

// The branches GitHub named, where it did.
const branchesOf = ({
  branch,
  base,
}: Change): Pick<SessionPullRequest, 'branch' | 'base'> => ({
  ...(branch && { branch }),
  ...(base && { base }),
});

const totalsOf = ({ totals }: Change): Pick<SessionPullRequest, 'summary'> =>
  totals ? { summary: totals } : {};

const pullRequestOf = (change: PullRequestChange): SessionPullRequest => ({
  ...stateOf(change),
  ...branchesOf(change),
  ...totalsOf(change),
  id: change.id,
  repository: change.repository,
  url: change.pullRequest.url,
  number: change.pullRequest.number,
  title: change.title,
  mergeable: !change.conflict,
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
