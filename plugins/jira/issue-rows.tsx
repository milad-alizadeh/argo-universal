import {
  Action,
  issueRow,
  Label,
  List,
  type IssueCategory,
  Pill,
  type PagedList,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import { isFailure, type ListedItem } from './issue-pages';
import { issuePath } from './jira-paths';
import type { JiraIssue, StatusCategory } from './jira-readers';
import type { JiraSite } from './jira-store';

/*
 * The project's issues drawn as the Issue tracker draws GitHub's (`plugins/issue-tracker/filter-rows.tsx`): a status
 * mark before the title, the key under it, and the row's marks, Labels then Pills, in its meta line.
 */

// Jira's status categories as Argo's tones: to do is quiet, as the Issue tracker's neutral pills are, in progress is under way, done is finished.
export const categoryTones: Record<StatusCategory, 'muted' | 'info' | 'done'> =
  {
    new: 'muted',
    indeterminate: 'info',
    done: 'done',
  };

const categories: Record<StatusCategory, IssueCategory> = {
  new: 'open',
  indeterminate: 'in-progress',
  done: 'done',
};

const personIcon = { sf: 'person', material: 'person' } as const;

const priorityIcon = { sf: 'flag', material: 'flag' } as const;

// Who the issue is assigned to, as the Issue tracker's marks are drawn: a Label with its icon.
const assigneeLabel = ({ assignee }: JiraIssue): JSX.Element =>
  assignee ? (
    <Label key="assignee" icon={personIcon} text={assignee.name} />
  ) : (
    <Label key="assignee" icon={personIcon} text="Unassigned" tone="muted" />
  );

const priorityLabel = ({ priority }: JiraIssue): JSX.Element[] =>
  priority
    ? [<Label key="priority" icon={priorityIcon} text={priority} />]
    : [];

// Jira's own status name, as the Issue tracker shows GitHub's labels: a Pill after the marks.
const statusPill = ({ status }: JiraIssue): JSX.Element => (
  <Pill key="status" text={status.name} tone={categoryTones[status.category]} />
);

type RowTo = PageTo<{ site: string }>;

// Where a row goes: the issue's page in this Project, and Jira on its site from its menu.
type Rows = { site: JiraSite; projectId: string; to: RowTo };

const openInJira = (site: JiraSite, issue: JiraIssue): JSX.Element => (
  <Action
    key="open-in-jira"
    label="Open in Jira"
    icon="external-link"
    onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
  />
);

// A keyed ListItem itself, as a List draws its children. It opens the issue's page; its menu opens it in Jira.
const jiraRow = (rows: Rows, issue: JiraIssue): JSX.Element =>
  issueRow(
    {
      id: issue.key,
      category: categories[issue.status.category],
      title: issue.summary || issue.key,
      issueKey: issue.key,
      labels: [assigneeLabel(issue), ...priorityLabel(issue)],
      pills: [statusPill(issue)],
      onPress: rows.to.go(issuePath(rows.projectId, issue.key)),
      actions: openInJira(rows.site, issue),
    },
    issue.key,
  );

// What the list says in place of its rows when there are none.
export type ListFrame = Pick<PluginProps['List'], 'empty'>;

type Paging = { list: PagedList<ListedItem>; to: RowTo };

// Load more appends Jira's next page, and a pull reads them again from the first.
const pagingProps = ({
  list,
  to,
}: Paging): Pick<PluginProps['List'], 'onRefresh' | 'pagination'> => ({
  onRefresh: to.set({}),
  pagination: list.pagination,
});

const issueRows = (rows: Rows, items: readonly ListedItem[]): JSX.Element[] =>
  items.flatMap((item) => (isFailure(item) ? [] : [jiraRow(rows, item)]));

// The project's issues, one row each, in the Issue tracker's plain compact list.
export const issueList = (
  site: JiraSite,
  { list, to, projectId, ...frame }: Paging & ListFrame & { projectId: string },
): JSX.Element => (
  <List
    accessibilityLabel="Jira issues"
    appearance="plain"
    density="compact"
    {...frame}
    {...pagingProps({ list, to })}
  >
    {issueRows({ site, projectId, to }, list.items)}
  </List>
);
