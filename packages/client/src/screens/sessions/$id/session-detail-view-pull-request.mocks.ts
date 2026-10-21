import { fn } from 'storybook/test';
import { type SessionPullRequest } from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';

// A Session's PR with its checks running, failing or passed.
const sessionPullRequest = {
  number: 45,
  title: 'Build the Session layout from spec 0003',
  stage: 'open',
  mergeable: false,
} satisfies SessionPullRequest;

export const pullRequestMocks = {
  checksRunning: {
    ...sessionPullRequest,
    summary: { files: 6, additions: 168, deletions: 42 },
    checks: { passed: 3, failing: 0, running: 2, total: 5 },
  },
  checksFailing: {
    ...sessionPullRequest,
    summary: { files: 2, additions: 32, deletions: 8 },
    checks: { passed: 4, failing: 1, running: 0, total: 5 },
  },
  checksPassed: {
    ...sessionPullRequest,
    summary: { files: 3, additions: 67, deletions: 11 },
    checks: { passed: 5, failing: 0, running: 0, total: 5 },
    mergeable: true,
  },
  followUp: {
    number: 46,
    title: 'Wire the Inspector to the changed files',
    stage: 'open',
    modifier: 'draft',
    mergeable: false,
  },
  merged: { ...sessionPullRequest, number: 42, stage: 'merged' },
  closed: { ...sessionPullRequest, number: 41, stage: 'closed' },
} satisfies Record<string, SessionPullRequest>;

// The Session's PR props, presented by its Workbench and Stage.
export function withPullRequests(
  session: OpenSessionViewProps,
  pullRequests: SessionPullRequest[],
): OpenSessionViewProps {
  return {
    ...session,
    header: {
      ...session.header,
      pullRequests,
      changes: session.header.changes ?? changesHeader(pullRequests),
      onMerge: fn(),
      onMergeMethodChange: fn(),
    },
  };
}

export const severalPullRequests: SessionPullRequest[] = [
  pullRequestMocks.checksRunning,
  {
    ...pullRequestMocks.checksFailing,
    number: 44,
    title: 'Draw the Shell output',
  },
  {
    ...pullRequestMocks.checksPassed,
    number: 43,
    title: 'Add the Stage tab strip',
  },
  pullRequestMocks.followUp,
  pullRequestMocks.merged,
  pullRequestMocks.closed,
];

function changesHeader(
  changes: SessionPullRequest[],
): NonNullable<OpenSessionViewProps['header']['changes']> {
  const summaries = changes.flatMap(({ summary }) =>
    summary ? [summary] : [],
  );

  return {
    open: false,
    onOpenChange: fn(),
    summary: summaries.length ? summaries.reduce(addSummary) : undefined,
  };
}

const addSummary = (
  total: NonNullable<SessionPullRequest['summary']>,
  next: NonNullable<SessionPullRequest['summary']>,
): NonNullable<SessionPullRequest['summary']> => ({
  files: total.files + next.files,
  additions: total.additions + next.additions,
  deletions: total.deletions + next.deletions,
});
