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

const renderIssue = (selected) => (issue) => (
  <ListItem
    key={issue.id}
    title={issue.title}
    selected={issue.id === selected?.id}
    onPress={{ action: 'navigate', path: issuePath(issue) }}
  />
);

const noIssue = (
  <EmptyState
    title="Select an Issue"
    description="Choose an Issue from the list."
  />
);

const issueDetail = (issue) => (
  <Screen title={issue.title}>
    <Detail markdown={`Fixture Issue ${issue.id}.`} />
  </Screen>
);

// The Issues beside the one the route names; the list moves to the Frame's sidebar on a wide window.
function IssuesListDetail({ selected }) {
  return (
    <ListDetail
      list={
        <List
          appearance="cards"
          items={issues}
          renderItem={renderIssue(selected)}
        />
      }
      detail={selected ? issueDetail(selected) : undefined}
      empty={noIssue}
    />
  );
}

const issuePage = (issue) =>
  function IssuePage() {
    return <IssuesListDetail selected={issue} />;
  };

export function registerIssues(pages) {
  pages.register(issuesPath, () => <IssuesListDetail />);

  for (const issue of issues)
    pages.register(issuePath(issue), issuePage(issue));
}
