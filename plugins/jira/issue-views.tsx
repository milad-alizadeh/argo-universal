import {
  Action,
  Button,
  EmptyState,
  Screen,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { failedScreen, failureBody } from './failure-view';
import { filterMenu } from './filter-menu';
import { isFailure } from './issue-pages';
import { issueList, type ListFrame } from './issue-rows';
import type { JiraFailure } from './jira-client';
import { activeFilters, noFilters } from './jira-filters';
import type { FailedView, ProjectView } from './jira-setup';
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

/*
 * The header the Issue tracker's list has (`plugins/issue-tracker/filter-page-header.ts`): the title and a search
 * that lands once typing pauses. Jira's filters are Page state rather than sidebar rows, so they sit in its Filter
 * menu beside the project's actions.
 */
const issuesHeader = (
  { project, people }: Issues,
  framing: Framing,
  listing: Listing,
): Omit<PluginProps['Screen'], 'children'> => ({
  title: project.name,
  search: { label: 'Search issues' },
  value: listing.filters.text,
  onChangeText: listing.to.bind('text'),
  actions: [filterMenu(people, listing), ...projectActions(framing)],
});

// Under the rows the list names its Jira project and site, as the Issue tracker names its repository.
const listFrame = ({ project, site }: Issues, listing: Listing): ListFrame => ({
  footer: `${project.key} · ${site.host}`,
  empty: emptyList(project.key, listing),
});

// The project's issues the filters leave; load more reads the next page from Jira's cursor.
const issueScreen = (
  view: Issues,
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Screen {...issuesHeader(view, framing, listing)}>
    {issueList(view.site, {
      list: listing.list,
      to: framing.to,
      ...listFrame(view, listing),
    })}
  </Screen>
);

type Drawing = { framing: Framing; listing: Listing };

const listRefusal = (
  { site, chosen }: Issues,
  failure: JiraFailure,
): FailedView => ({ kind: 'failed', site, failure, reading: 'issues', chosen });

// A refusal other than the sign-in's, under the list's own header, so its search and filters stay to change.
const refusedScreen = (
  view: Issues,
  failure: JiraFailure,
  { framing, listing }: Drawing,
): JSX.Element => (
  <Screen {...issuesHeader(view, framing, listing)}>
    {failureBody(listRefusal(view, failure), framing, listing)}
  </Screen>
);

// Why Jira refused the list's first page, in the list's place: a refused token leads to signing in again.
const refusedList = (
  view: Issues,
  failure: JiraFailure,
  drawing: Drawing,
): JSX.Element =>
  failure.kind === 'signed-out'
    ? setupScreen(
        { kind: 'signed-out', message: failure.message },
        drawing.framing,
      )
    : refusedScreen(view, failure, drawing);

// The list, or why Jira refused its first page in the list's place.
function issues(view: Issues, framing: Framing, listing: Listing): JSX.Element {
  const refused = listing.list.items.find(isFailure);

  return refused
    ? refusedList(view, refused.failed, { framing, listing })
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
