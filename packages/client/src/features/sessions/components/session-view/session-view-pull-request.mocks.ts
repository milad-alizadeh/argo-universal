import { fn } from 'storybook/test';
import type { SessionPullRequest } from '../session-pull-request';
import type { OpenSessionViewProps } from './session-view';

// A Session's PR with its checks running, failing or passed.
const sessionPullRequest = {
  number: 45,
  title: 'Build the Session layout from spec 0003',
  status: 'open',
  mergeable: false,
} satisfies SessionPullRequest;

export const pullRequestMocks = {
  checksRunning: {
    ...sessionPullRequest,
    checks: { passed: 3, failing: 0, running: 2, total: 5 },
  },
  checksFailing: {
    ...sessionPullRequest,
    checks: { passed: 4, failing: 1, running: 0, total: 5 },
  },
  checksPassed: {
    ...sessionPullRequest,
    checks: { passed: 5, failing: 0, running: 0, total: 5 },
    mergeable: true,
  },
  followUp: {
    number: 46,
    title: 'Wire the Inspector to the changed files',
    status: 'draft',
    mergeable: false,
  },
} satisfies Record<string, SessionPullRequest>;

// The running Session with its PRs on the header.
export function withPullRequests(
  session: OpenSessionViewProps,
  pullRequests: SessionPullRequest[],
): OpenSessionViewProps {
  return {
    ...session,
    header: { ...session.header, pullRequests, onMerge: fn() },
  };
}
