import type { ChangesSummary } from '@repo/contracts';
import type { SessionPullRequest } from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import type { SectionFacts } from './session-section';

export const summaryOf = ({
  header,
}: SessionInspectorContent): ChangesSummary | undefined =>
  header?.changes?.summary;

const changedFiles = (content: SessionInspectorContent): number =>
  summaryOf(content)?.files ?? 0;

export const pullRequestsOf = ({
  header,
}: SessionInspectorContent): readonly SessionPullRequest[] =>
  header?.pullRequests ?? [];

export const changesFacts = {
  key: 'changes',
  title: 'Changes',
  icon: 'diff',
  // Always offered: until the page loads the changed files, the tab is empty.
  offered: (): boolean => true,
  // Changed files or pull requests, whichever is more.
  count: (content: SessionInspectorContent): number =>
    Math.max(changedFiles(content), pullRequestsOf(content).length),
} satisfies SectionFacts;
