import { EmptyState, List, ListItem, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { repositoryText } from './issue-client';
import { labelPills } from './label-pills';
import {
  useFilterIssues,
  type FilterIssues,
  type FilterSource,
} from './use-filter-issues';

// One filter's Issues, a page at a time; each row opens the Issue's own page.
export function FilterPage(source: FilterSource): JSX.Element {
  const issues = useFilterIssues(source);

  return (
    <Screen title={source.filter.title} caption={source.filter.search}>
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
      appearance="cards"
      footer={message || repositoryText(source.project)}
      empty={<EmptyState title={message || 'No Issues.'} />}
      pagination={{ hasMore: issues.hasMore, onLoadMore: issues.loadMore }}
      onRefresh={issues.refresh}
    >
      {issues.issues.map((issue) => issueRow(source, issue))}
    </List>
  );
}

// A keyed ListItem itself, as a List draws its children, not a component that returns one.
function issueRow({ project, deps }: FilterSource, issue: Issue): JSX.Element {
  return (
    <ListItem
      key={issue.number}
      id={String(issue.number)}
      title={issue.title}
      subtitle={`#${issue.number}`}
      onPress={{
        action: 'navigate',
        path: deps.pages.issuePagePath(project, issue.number),
      }}
      meta={labelPills(issue.labels)}
    />
  );
}
