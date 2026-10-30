import type { IssueStatus } from './github-issues';

type StatusView = {
  text: string;
  tone: string;
  change: { label: string; icon: string; to: IssueStatus };
};

// How each status reads, and the press that moves the Issue to the other one.
export const statuses = {
  open: {
    text: 'Open',
    tone: 'success',
    change: { label: 'Close Issue', icon: 'check', to: 'closed' },
  },
  closed: {
    text: 'Closed',
    tone: 'done',
    change: { label: 'Reopen Issue', icon: 'issue', to: 'open' },
  },
} as const satisfies Record<IssueStatus, StatusView>;
