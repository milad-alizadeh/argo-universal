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
import { issuePath } from './jira-paths';
import type { JiraIssue, StatusCategory } from './jira-readers';
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

const priorityLabels = ({ priority }: JiraIssue): JSX.Element[] =>
  priority
    ? [<Label key="priority" icon={priorityIcon} text={priority} />]
    : [];

const assigneeLabel = ({ assignee }: JiraIssue): JSX.Element =>
  assignee ? (
    <Label key="assignee" icon={personIcon} text={assignee.name} />
  ) : (
    <Label key="assignee" icon={personIcon} text="Unassigned" tone="muted" />
  );

// What a row says after its title: the status, then its priority and who it is assigned to.
const rowMeta = (issue: JiraIssue): JSX.Element[] => [
  <Pill
    key="status"
    text={issue.status.name}
    tone={categoryTones[issue.status.category]}
  />,
  ...priorityLabels(issue),
  assigneeLabel(issue),
];

export type Rows = {
  site: JiraSite;
  projectId: string;
  to: PageTo<{ site: string }>;
};

const openInJira = (site: JiraSite, issue: JiraIssue): JSX.Element => (
  <Action
    key="open-in-jira"
    label="Open in Jira"
    icon="external-link"
    onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
  />
);

// A keyed ListItem itself, as a List draws its children. It opens the issue's page; its menu opens it in Jira.
const issueRow = (rows: Rows, issue: JiraIssue): JSX.Element => (
  <ListItem
    key={issue.key}
    id={issue.key}
    title={issue.summary || issue.key}
    subtitle={issue.key}
    finished={issue.status.category === 'done'}
    meta={rowMeta(issue)}
    onPress={rows.to.go(issuePath(rows.projectId, issue.key))}
    actions={openInJira(rows.site, issue)}
  />
);

// The project's issues, one row each; a pull reads them again.
export const issueList = (rows: Rows, issues: JiraIssue[]): JSX.Element => (
  <List accessibilityLabel="Jira issues" onRefresh={rows.to.set({})}>
    {issues.map((issue) => issueRow(rows, issue))}
  </List>
);
