import {
  Detail,
  EmptyState,
  List,
  ListDetail,
  ListItem,
  Screen,
} from '@argo/plugin-kit';

const issues = [
  { id: '412', title: 'Sync fails on large repos' },
  { id: '418', title: 'Add CSV export' },
];

const issuesPath = '/issues';

// The same path registers an Issue's page and opens it.
const issuePath = (issue) => `${issuesPath}/${issue.id}`;

const renderIssue = (issue) => (
  <ListItem
    key={issue.id}
    title={issue.title}
    onPress={{ action: 'navigate', path: issuePath(issue) }}
  />
);

const noIssue = (
  <EmptyState
    title="Select an Issue"
    description="Choose an Issue from the list."
  />
);

// The section's one list, which moves to the Frame's sidebar on a wide window beside the page a row opens.
function IssuesRoot() {
  return (
    <ListDetail
      list={<List appearance="cards" items={issues} renderItem={renderIssue} />}
      empty={noIssue}
    />
  );
}

const issuePage = (issue) =>
  function IssuePage() {
    return (
      <Screen title={issue.title}>
        <Detail markdown={`Fixture Issue ${issue.id}.`} />
      </Screen>
    );
  };

export function registerIssues(pages) {
  pages.register(issuesPath, IssuesRoot);

  for (const issue of issues)
    pages.register(issuePath(issue), issuePage(issue));
}
