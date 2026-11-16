import {
  Action,
  Label,
  List,
  ListItem,
  Pill,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import type { JiraIssue, StatusCategory } from './jira-client';
import { issuePath } from './jira-paths';
import type { JiraSite } from './jira-store';

// Jira's status categories as Argo's tones: to do is plain, in progress is under way, done is finished.
export const categoryTones: Record<
  StatusCategory,
  'neutral' | 'info' | 'done'
> = {
  new: 'neutral',
  indeterminate: 'info',
  done: 'done',
};

const personIcon = { sf: 'person', material: 'person' } as const;

const priorityIcon = { sf: 'flag', material: 'flag' } as const;

// What a row says after its title: the status, then its priority and who it is assigned to.
const rowMeta = (issue: JiraIssue): JSX.Element[] => [
  <Pill
    key="status"
    text={issue.status.name}
    tone={categoryTones[issue.status.category]}
  />,
  ...(issue.priority
    ? [<Label key="priority" icon={priorityIcon} text={issue.priority} />]
    : []),
  <Label
    key="assignee"
    icon={personIcon}
    text={issue.assignee?.name ?? 'Unassigned'}
    tone={issue.assignee ? 'neutral' : 'muted'}
  />,
];

type RowTo = PageTo<{ site: string }>;

type Rows = { site: JiraSite; projectId: string; to: RowTo };

// A keyed ListItem itself, as a List draws its children. It opens the issue's page; its menu opens it in Jira.
const issueRow = (
  { site, projectId, to }: Rows,
  issue: JiraIssue,
): JSX.Element => (
  <ListItem
    key={issue.key}
    id={issue.key}
    title={issue.summary || issue.key}
    subtitle={issue.key}
    finished={issue.status.category === 'done'}
    meta={rowMeta(issue)}
    onPress={to.go(issuePath(projectId, issue.key))}
    actions={
      <Action
        key="open-in-jira"
        label="Open in Jira"
        icon="external-link"
        onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
      />
    }
  />
);

// The project's issues, one row each; a pull reads them again.
export const issueList = (rows: Rows, issues: JiraIssue[]): JSX.Element => (
  <List accessibilityLabel="Jira issues" onRefresh={rows.to.set({})}>
    {issues.map((issue) => issueRow(rows, issue))}
  </List>
);
