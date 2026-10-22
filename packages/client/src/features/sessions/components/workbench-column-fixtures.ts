import type { SessionHeaderPanels } from './session-header-props';
import { severalPullRequests } from './session-pull-request.mocks';
import { runningShells } from './shell-list/shell-list-fixtures';
import { severalMixedSubagents } from './subagent-list/subagent-list-fixtures';

// A story supplies the callbacks; a fixture is the work the Workbench has to show.
type WorkbenchPanelsFixture = Omit<
  SessionHeaderPanels,
  'onSelect' | 'onToggle' | 'onOpenChanges'
>;

export const allSections = {
  offered: ['changes', 'subagents', 'shells'],
  counts: {
    changes: severalPullRequests.length,
    subagents: severalMixedSubagents.subagents.length,
    shells: runningShells.shells.length,
  },
  pullRequests: severalPullRequests,
  changesSummary: { files: 11, additions: 267, deletions: 61 },
  agents: severalMixedSubagents,
} satisfies WorkbenchPanelsFixture;
