import { issueStatusMark, type IssueCategory } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueStatus } from './github-issues';

type Marked = { status: IssueStatus; closedAs?: 'completed' | 'not-planned' };

export function issueCategory({ status, closedAs }: Marked): IssueCategory {
  if (status === 'open') return 'open';

  return closedAs === 'not-planned' ? 'not-planned' : 'done';
}

export function statusMark(issue: Marked, key?: string): JSX.Element {
  return issueStatusMark(issueCategory(issue), key);
}
