import {
  Button,
  EmptyState,
  Label,
  List,
  ListItem,
  Pill,
  Screen,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { repositoryText } from './issue-project';
import { statusMark } from './issue-status-mark';
import { issueTree, type IssueNode } from './issue-tree';
import { rowLabelPills } from './label-pills';
import {
  useFilterIssues,
  type FilterIssues,
  type FilterSource,
} from './use-filter-issues';

// One filter's Issues, a page at a time; each row opens the Issue's own page.
export function FilterPage(source: FilterSource): JSX.Element {
  const issues = useFilterIssues(source);

  return (
    <Screen title={source.filter.title}>
      <IssueList source={source} issues={issues} />
    </Screen>
  );
}

type IssueListProps = { source: FilterSource; issues: FilterIssues };

// The footer names the Project's repository, or the latest load message in its place.
function IssueList({ source, issues }: IssueListProps): JSX.Element {
  const { message } = issues;

  return (
    <List
      appearance="plain"
      density="compact"
      footer={message || repositoryText(source.project)}
      empty={<IssuesEmpty source={source} issues={issues} />}
      pagination={{ hasMore: issues.hasMore, onLoadMore: issues.loadMore }}
      onRefresh={issues.refresh}
    >
      {issueTree(issues.issues).map((node) => issueRow(source, node))}
    </List>
  );
}

/*
 * No Issues, or the reason there are none. A reason such as a missing remote or a failed read offers to look again,
 * which reads the Projects, as a remote added since is what the Project lacked.
 */
function IssuesEmpty({ source, issues }: IssueListProps): JSX.Element {
  const { message } = issues;
  const checkAgain = (): void => void lookAgain(source, issues);
  const action = <Button label="Check again" onPress={checkAgain} />;

  return (
    <EmptyState
      title={message || 'No Issues.'}
      action={message ? action : undefined}
    />
  );
}

async function lookAgain(
  source: FilterSource,
  issues: FilterIssues,
): Promise<void> {
  await source.deps.projects.refresh();
  await issues.refresh();
}

// A keyed ListItem itself, as a List draws its children, not a component that returns one; its sub-Issues nest inside.
function issueRow(source: FilterSource, node: IssueNode): JSX.Element {
  return (
    <ListItem key={node.issue.number} {...rowProps(source, node.issue)}>
      {node.children.map((child) => issueRow(source, child))}
    </ListItem>
  );
}

type RowProps = Pick<
  PluginProps['ListItem'],
  'id' | 'leading' | 'title' | 'subtitle' | 'finished' | 'onPress' | 'meta'
>;

const rowProps = ({ project, deps }: FilterSource, issue: Issue): RowProps => {
  // The Issue's page opens with this row's title and status, and fills in the rest.
  deps.seeds.remember(project.id, issue);

  return {
    id: String(issue.number),
    leading: statusMark(issue),
    title: issue.title,
    subtitle: `#${issue.number}`,
    finished: issue.status !== 'open',
    onPress: {
      action: 'navigate',
      path: deps.pages.issuePagePath(project, issue.number),
    },
    meta: [...rowMarks(issue), ...rowLabelPills(issue.labels)],
  };
};

/*
 * What the row says about the Issue's relations before its labels: that open blockers hold it up, and
 * how far its sub-Issues have come. An Issue with neither shows neither.
 */
function rowMarks(issue: Issue): JSX.Element[] {
  return [...blockedMark(issue), ...progressMark(issue)];
}

function blockedMark(issue: Issue): JSX.Element[] {
  const open = openBlockers(issue);

  if (open === 0) return [];

  return [
    <Label
      key="blocked"
      icon="refused"
      text={blockedText(open)}
      tone="warning"
    />,
  ];
}

const openBlockers = ({ blockedBy }: Issue): number =>
  (blockedBy ?? []).filter((blocker) => blocker.status === 'open').length;

const blockedText = (open: number): string =>
  open === 1 ? 'Blocked' : `Blocked by ${open}`;

function progressMark({ progress }: Issue): JSX.Element[] {
  if (!progress) return [];

  return [
    <Pill
      key="progress"
      text={`${progress.completed} / ${progress.total}`}
      tone="muted"
    />,
  ];
}
