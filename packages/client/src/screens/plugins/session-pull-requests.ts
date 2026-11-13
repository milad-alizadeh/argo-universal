import type { Change } from '@repo/contracts';
import type { SessionPullRequest } from '#features/sessions';
import type { SlotReading } from './slot-items';

type PullRequestChange = Change & {
  pullRequest: NonNullable<Change['pullRequest']>;
};

const hasPullRequest = (change: Change): change is PullRequestChange =>
  change.pullRequest !== undefined;

// The App draws one modifier on an Open Change: a conflict is what blocks it, so it shows ahead of draft.
const modifierOf = ({
  conflict,
  draft,
}: Change): 'conflict' | 'draft' | undefined => {
  if (conflict) return 'conflict';

  return draft ? 'draft' : undefined;
};

const stateOf = (
  change: Change,
): Pick<SessionPullRequest, 'stage' | 'modifier'> => {
  const modifier = modifierOf(change);

  return change.stage === 'open' && modifier
    ? { stage: 'open', modifier }
    : { stage: change.stage };
};

const pullRequestOf = (change: PullRequestChange): SessionPullRequest => ({
  ...stateOf(change),
  id: change.id,
  url: change.pullRequest.url,
  number: change.pullRequest.number,
  title: change.title,
  mergeable: !change.conflict,
  ...(change.totals && { summary: change.totals }),
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
