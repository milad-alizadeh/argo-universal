import { fn } from 'storybook/test';
import { type SessionPullRequest } from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';

export {
  pullRequestMocks,
  severalPullRequests,
} from '../../../features/sessions/components/session-pull-request.mocks';

// The Session's PR props, presented by its Workbench and Inspector.
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
    },
  };
}

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
