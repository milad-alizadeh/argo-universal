import {
  Detail,
  EmptyState,
  List,
  ListDetail,
  ListItem,
  Page,
} from '@argo/plugin-kit';

const issues = [
  { id: '412', title: 'Sync fails on large repos' },
  { id: '418', title: 'Add CSV export' },
];

const issuesPath = '/issues';

// A Plugin opens its pages by their full App path: the Plugin id, the nav id, then its own path.
const issueHref = (issue) => `/plugins/lists/issues${issuesPath}/${issue.id}`;

const renderIssue = (selected) => (issue) => (
  <ListItem
    key={issue.id}
    title={issue.title}
    selected={issue.id === selected?.id}
    onPress={{ action: 'navigate', path: issueHref(issue) }}
  />
);

const noIssue = (
  <EmptyState
    title="Select an Issue"
    description="Choose an Issue from the list."
  />
);

const issueDetail = (issue) => (
  <Page title={issue.title}>
    <Detail markdown={`Fixture Issue ${issue.id}.`} />
  </Page>
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
    pages.register(`${issuesPath}/${issue.id}`, issuePage(issue));
}
