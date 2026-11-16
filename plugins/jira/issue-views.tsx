import {
  Action,
  Button,
  EmptyState,
  Screen,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { failedScreen } from './failure-views';
import { filterMenu } from './filter-menu';
import { isFailure } from './issue-pages';
import { issueList } from './issue-rows';
import { activeFilters, noFilters } from './jira-filters';
import type { ProjectView } from './jira-setup';
import { changeSite, setupScreen } from './setup-views';
import type { Framing, Listing } from './view-frame';

const swapIcon = {
  sf: 'arrow.left.arrow.right',
  material: 'swap_horiz',
} as const;

const projectActions = (framing: Framing): JSX.Element[] => [
  <Action
    key="change-project"
    label="Change Jira project"
    icon={swapIcon}
    onPress={framing.to.run('forgetProject', { projectId: framing.projectId })}
  />,
  changeSite(framing),
];

type Issues = Extract<ProjectView, { kind: 'issues' }>;

const noIssues = (key: string): JSX.Element => (
  <EmptyState
    title={`No issues in ${key}`}
    description="Issues created in this Jira project show here."
  />
);

const noMatches = (key: string, { to }: Listing): JSX.Element => (
  <EmptyState
    title="No issues match these filters"
    description={`Try other filters, or clear them to see every issue in ${key}.`}
    action={<Button label="Clear filters" onPress={to.set(noFilters)} />}
  />
);

// An empty list says whether the project has no issues or the filters left none, and offers to clear them.
const emptyList = (key: string, listing: Listing): JSX.Element =>
  activeFilters(listing.filters) === 0
    ? noIssues(key)
    : noMatches(key, listing);

// The header searches the project's issues once typing pauses; the Filter menu narrows them at once.
const issuesHeader = (
  { project, site, people }: Issues,
  framing: Framing,
  listing: Listing,
): Omit<PluginProps['Screen'], 'children'> => ({
  title: project.name,
  caption: `${project.key} · ${site.host}`,
  width: 'full',
  search: { label: `Search ${project.key}` },
  value: listing.filters.text,
  onChangeText: listing.to.bind('text'),
  actions: [filterMenu(people, listing), ...projectActions(framing)],
});

// The project's issues the filters leave; load more reads the next page from Jira's cursor.
const issueScreen = (
  view: Issues,
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Screen {...issuesHeader(view, framing, listing)}>
    {listing.list.items.length === 0
      ? emptyList(view.project.key, listing)
      : issueList(view.site, listing.list, framing.to)}
  </Screen>
);

// The list, or why Jira refused its first page in the list's place.
function issues(view: Issues, framing: Framing, listing: Listing): JSX.Element {
  const refused = listing.list.items.find(isFailure);

  return refused
    ? failedScreen(
        { site: view.site, failure: refused.failed },
        framing,
        listing,
      )
    : issueScreen(view, framing, listing);
}

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: Framing,
  listing: Listing,
): JSX.Element {
  if (view.kind === 'issues') return issues(view, framing, listing);

  return view.kind === 'failed'
    ? failedScreen(view, framing, listing)
    : setupScreen(view, framing);
}
