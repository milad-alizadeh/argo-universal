import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { severalPullRequests } from '../session-pull-request.mocks';
import type { WorkbenchSection } from '../session-workbench';
import { WorkbenchAgents } from '../session-workbench-agents';
import { WorkbenchChangesSummary } from '../session-workbench-change-section';
import { WorkbenchMoreChanges } from '../session-workbench-changes';
import { sessionShells } from '../shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from '../subagent-list/subagent-list.mocks';
import { WorkbenchCountSummary } from '../workbench-count-summary';

/*
 * Spec 0026 (#1866) option boards: one Session's Workbench cards, as its Sections draw them: Changes, Agents, Shells
 * and the Issue tracker's card. Nothing here is built; the owner picks a header and a surface first.
 */

// A Section's card with what the options add to its title line: its icon and a count.
export interface OptionSection extends WorkbenchSection {
  icon: IconSymbol;
  count?: string;
}

// The Issue tracker's page as the Plugin draws it today: a kit List, whose default look is cards.
function IssueCardPage(): ReactElement {
  return (
    <List>
      <IssueRow />
    </List>
  );
}

// The same page as plain rows, pulled out to the card's edge as Argo's own rows are.
function IssuePlainPage(): ReactElement {
  return (
    <View className="-mx-3 -my-2">
      <List appearance="plain" padding={0} paddingTop={0} paddingBottom={0}>
        <IssueRow />
      </List>
    </View>
  );
}

const IssueRow = (): ReactElement => (
  <ListItem
    title="Work on the tracker card"
    subtitle="#42 · Open"
    leading={<Icon name="pending" tone="muted" size="sm" />}
  />
);

const changes: OptionSection = {
  key: 'changes',
  title: 'Changes',
  icon: 'changed-files',
  count: '+267 −61',
  summary: (
    <WorkbenchChangesSummary pullRequests={severalPullRequests} onOpen={fn()} />
  ),
  footer: <WorkbenchMoreChanges changes={severalPullRequests} onOpen={fn()} />,
};

const agents: OptionSection = {
  key: 'subagents',
  title: 'Agents',
  icon: 'agent',
  count: String(subagentStates.severalMixed.length),
  summary: (
    <WorkbenchAgents
      subagents={subagentStates.severalMixed}
      now={subagentNow}
    />
  ),
  onOpen: fn(),
};

// Shells counts nothing on the title line: its body is already the count, and the line would say it twice.
const shells: OptionSection = {
  key: 'shells',
  title: 'Shells',
  icon: 'terminal',
  summary: (
    <WorkbenchCountSummary
      count={sessionShells.length}
      icon="terminal"
      noun="shell"
    />
  ),
  onOpen: fn(),
};

const issue = (plain: boolean): OptionSection => ({
  key: 'plugin:issue-tracker/issue',
  title: 'Issue',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  summary: plain ? <IssuePlainPage /> : <IssueCardPage />,
  onOpen: fn(),
  noRows: true,
});

// The column's cards, with the Issue's page as the Plugin draws it today or as plain rows.
export const optionSections = (plainIssue: boolean): OptionSection[] => [
  changes,
  agents,
  shells,
  issue(plainIssue),
];
