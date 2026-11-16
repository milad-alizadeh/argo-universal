import {
  Label,
  List,
  ListItem,
  Pill,
  type PagedList,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import type { JiraIssue, StatusCategory } from './jira-readers';
import type { JiraSite } from './jira-store';

// Jira's status categories as Argo's tones: to do is plain, in progress is under way, done is finished.
const categoryTones: Record<StatusCategory, 'neutral' | 'info' | 'done'> = {
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

// A keyed ListItem itself, as a List draws its children. It opens the issue in Jira until Argo has its own page.
const issueRow = (site: JiraSite, issue: JiraIssue): JSX.Element => (
  <ListItem
    key={issue.key}
    id={issue.key}
    title={issue.summary || issue.key}
    subtitle={issue.key}
    finished={issue.status.category === 'done'}
    meta={rowMeta(issue)}
    onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
  />
);

// The project's issues, one row each: load more appends Jira's next page, and a pull reads them again from the first.
export const issueList = (
  site: JiraSite,
  list: PagedList<JiraIssue>,
  to: PageTo<{ site: string }>,
): JSX.Element => (
  <List
    accessibilityLabel="Jira issues"
    onRefresh={to.set({})}
    pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }}
  >
    {list.items.map((issue) => issueRow(site, issue))}
  </List>
);
