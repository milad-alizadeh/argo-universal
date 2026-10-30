import type { ChangesSummary } from '@repo/contracts';
import type { SessionPullRequest } from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import type { SectionFacts } from './session-section';

const snapshotTotals = (
  content: SessionInspectorContent,
): ChangesSummary | undefined => content.header?.changes?.summary;

/*
 * The one reading of the Checkout every Changes surface summarises: the totals the Inspector loaded (ADR-0039). The
 * snapshot's totals stand in only until that first read settles, because they follow the Feed rather than the Checkout and
 * so lag it while a Turn runs (#1480).
 */
export const summaryOf = (
  content: SessionInspectorContent,
): ChangesSummary | undefined =>
  content.changes?.summary ?? snapshotTotals(content);

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
