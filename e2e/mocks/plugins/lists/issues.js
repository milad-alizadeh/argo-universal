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

// The same path opens an Issue's page and names it in the pattern.
const issuePath = (issue) => `${issuesPath}/${issue.id}`;

const issueRow = (selected) => (issue) => (
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
const issuesListDetail = (selected) => (
  <ListDetail
    list={<List appearance="cards">{issues.map(issueRow(selected))}</List>}
    detail={selected ? issueDetail(selected) : undefined}
    empty={noIssue}
  />
);

export function defineIssues(pages) {
  pages.define(issuesPath, {
    load: () => null,
    render: () => issuesListDetail(null),
  });
  pages.define(`${issuesPath}/:id`, {
    load: ({ params }) => issues.find(({ id }) => id === params.id) ?? null,
    render: issuesListDetail,
  });
}
