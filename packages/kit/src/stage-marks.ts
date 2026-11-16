import type { IconName } from './symbols/icon-names';

export type StageMark = {
  label: string;
  icon: IconName;
  tone: 'neutral' | 'success' | 'done' | 'danger';
};

/*
 * How a Change is marked, by Stage: the one table the Session row, the Workbench, a link's mark and its hover card
 * all draw from, so a pull request never reads differently in two places. A draft is an Open Change that is not
 * ready, and has a mark of its own.
 */
export const changeMarks = {
  working: { label: 'Working', icon: 'pencil', tone: 'neutral' },
  branch: { label: 'Branch', icon: 'branch', tone: 'neutral' },
  open: { label: 'Open', icon: 'pr-open', tone: 'success' },
  draft: { label: 'Draft', icon: 'pr-draft', tone: 'neutral' },
  merged: { label: 'Merged', icon: 'pr-merged', tone: 'done' },
  closed: { label: 'Closed', icon: 'pr-closed', tone: 'danger' },
} as const satisfies Record<string, StageMark>;

export type ChangeMarkName = keyof typeof changeMarks;

// How an Issue is marked: a closed Issue is done, where a closed pull request was turned down.
export const issueMarks = {
  open: { label: 'Open', icon: 'git-issue-open', tone: 'success' },
  closed: { label: 'Closed', icon: 'git-issue-closed', tone: 'done' },
} as const satisfies Record<string, StageMark>;
