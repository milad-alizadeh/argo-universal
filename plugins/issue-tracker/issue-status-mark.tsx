import { Icon } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueStatus } from './github-issues';

// Why GitHub closed an Issue, where the row knows it; a relation's row knows only that it is closed.
type Marked = { status: IssueStatus; closedAs?: 'completed' | 'not-planned' };

/*
 * GitHub has no workflow, so its states take the tracker types' default marks: open, done, and closed
 * with a reason. The list screen and an Issue's sub-Issues mark a row the same way.
 */
// `key` names the mark, so a Loader page's optimistic patch can repaint it.
export function statusMark(
  { status, closedAs }: Marked,
  key?: string,
): JSX.Element {
  if (status === 'open')
    return <Icon key={key} name="pending" tone="muted" size="sm" />;

  return closedAs === 'not-planned' ? (
    <Icon key={key} name="failed" tone="muted" size="sm" filled />
  ) : (
    <Icon key={key} name="passed" tone="done" size="sm" filled />
  );
}
