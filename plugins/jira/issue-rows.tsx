import {
  Icon,
  Label,
  List,
  ListItem,
  Pill,
  type PagedList,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import { isFailure, type ListedItem } from './issue-pages';
import type { JiraIssue, StatusCategory } from './jira-readers';
import type { JiraSite } from './jira-store';

/*
 * The project's issues drawn as the Issue tracker draws GitHub's (`plugins/issue-tracker/filter-rows.tsx`): a status
 * mark before the title, the key under it, and the row's marks, Labels then Pills, in its meta line.
 */

// Jira's status categories as Argo's tones: to do is plain, in progress is under way, done is finished.
const categoryTones: Record<StatusCategory, 'neutral' | 'info' | 'done'> = {
  new: 'neutral',
  indeterminate: 'info',
  done: 'done',
};

const inProgressIcon = {
  sf: 'circle.lefthalf.filled',
  material: 'contrast',
} as const;

const statusMarks: Record<StatusCategory, JSX.Element> = {
  new: <Icon name="pending" tone="muted" size="sm" filled={false} />,
  indeterminate: <Icon name={inProgressIcon} tone="info" size="sm" />,
  done: <Icon name="passed" tone="done" size="sm" filled />,
};

/*
 * The row's leading mark, by status category, in the Issue tracker's marks for open and done
 * (`plugins/issue-tracker/issue-status-mark.tsx`); Jira's in progress has no GitHub state, so it is half filled.
 */
const issueStatusMark = ({ status }: JiraIssue): JSX.Element =>
  statusMarks[status.category];

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

// What a row says after its title: who has it and how urgent it is, then its status.
const rowMeta = (issue: JiraIssue): JSX.Element[] => [
  assigneeLabel(issue),
  ...priorityLabel(issue),
  statusPill(issue),
];

// A keyed ListItem itself, as a List draws its children. It opens the issue in Jira until Argo has its own page.
const issueRow = (site: JiraSite, issue: JiraIssue): JSX.Element => (
  <ListItem
    key={issue.key}
    id={issue.key}
    leading={issueStatusMark(issue)}
    title={issue.summary || issue.key}
    subtitle={issue.key}
    finished={issue.status.category === 'done'}
    meta={rowMeta(issue)}
    onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
  />
);

// What the list says under its rows, and in their place when there are none.
export type ListFrame = Pick<PluginProps['List'], 'footer' | 'empty'>;

type Paging = { list: PagedList<ListedItem>; to: PageTo<{ site: string }> };

// Load more appends Jira's next page, and a pull reads them again from the first.
const pagingProps = ({
  list,
  to,
}: Paging): Pick<PluginProps['List'], 'onRefresh' | 'pagination'> => ({
  onRefresh: to.set({}),
  pagination: { hasMore: list.hasMore, onLoadMore: list.loadMore },
});

const issueRows = (
  site: JiraSite,
  items: readonly ListedItem[],
): JSX.Element[] =>
  items.flatMap((item) => (isFailure(item) ? [] : [issueRow(site, item)]));

// The project's issues, one row each, in the Issue tracker's plain compact list.
export const issueList = (
  site: JiraSite,
  { list, to, ...frame }: Paging & ListFrame,
): JSX.Element => (
  <List
    accessibilityLabel="Jira issues"
    appearance="plain"
    density="compact"
    {...frame}
    {...pagingProps({ list, to })}
  >
    {issueRows(site, list.items)}
  </List>
);
