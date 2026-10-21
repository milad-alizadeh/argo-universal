import { ChangeDiffTotal } from './change-diff-total';
import type { WorkbenchCollapsibleTitleProps } from './workbench-collapsible-title';

// A story supplies onPress; a fixture is the title, its disclosure and its trailing summary.
type WorkbenchTitleFixture = Omit<WorkbenchCollapsibleTitleProps, 'onPress'>;

export const expandedWorkbenchTitle = {
  title: 'Changes',
  icon: 'diff',
  expanded: true,
  summary: <ChangeDiffTotal files={3} additions={24} deletions={6} />,
} satisfies WorkbenchTitleFixture;

export const collapsedWorkbenchTitle = {
  ...expandedWorkbenchTitle,
  expanded: false,
} satisfies WorkbenchTitleFixture;

// A section that cannot collapse: no disclosure, and the title opens the section instead.
export const notCollapsibleWorkbenchTitle = {
  title: 'Shells',
  icon: 'terminal',
} satisfies WorkbenchTitleFixture;
