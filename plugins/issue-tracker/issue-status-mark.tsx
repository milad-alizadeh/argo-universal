import { Icon } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueStatus } from './github-issues';

// Why GitHub closed an Issue, where the row knows it; a relation's row knows only that it is closed.
type Marked = { status: IssueStatus; closedAs?: 'completed' | 'not-planned' };

/*
 * GitHub has no workflow, so its states take the tracker types' default marks: open, done, and closed
 * with a reason. The list screen and an Issue's sub-Issues mark a row the same way.
 */
export function statusMark({ status, closedAs }: Marked): JSX.Element {
  if (status === 'open') return <Icon name="pending" tone="muted" size="sm" />;

  return closedAs === 'not-planned' ? (
    <Icon name="failed" tone="muted" size="sm" filled />
  ) : (
    <Icon name="passed" tone="done" size="sm" filled />
  );
}
