import {
  Action,
  Button,
  EmptyState,
  Screen,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { failedScreen, titleOf } from './failure-view';
import { filterMenu } from './filter-menu';
import { isFailure } from './issue-pages';
import { issueList, type ListFrame } from './issue-rows';
import type { JiraFailure } from './jira-client';
import { activeFilters, noFilters } from './jira-filters';
import type { ProjectView } from './jira-setup';
import { setupScreen } from './setup-views';
import type { Framing, Listing } from './view-frame';

/*
 * The project's own choices, with no icon, so the header keeps them in its overflow menu and shows only the Filter
 * menu and the search, as the Issue tracker's header shows only its search.
 */
const changeProject = ({ to, projectId }: Framing): JSX.Element => (
  <Action
    key="change-project"
    label="Change Jira project"
    onPress={to.run('forgetProject', { projectId })}
  />
);

const changeSiteChoice = ({ to, sitePath }: Framing): JSX.Element => (
  <Action
    key="change-site"
    label="Change Jira site"
    onPress={to.go(sitePath)}
  />
);

const projectActions = (framing: Framing): JSX.Element[] => [
  changeProject(framing),
  changeSiteChoice(framing),
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
 * Why Jira refused the list's first page, in the list's own empty state, as the Issue tracker says why it has no
 * Issues. Its filters and the project's choices stay in the header to change.
 */
const refusedList = (
  view: Issues,
  failure: JiraFailure,
  { to }: Framing,
): JSX.Element => (
  <EmptyState
    title={titleOf({ ...listRefusal(view), failure })}
    description={failure.message}
    action={<Button label="Try again" onPress={to.run('checkAgain', {})} />}
  />
);

const listRefusal = ({ site, chosen }: Issues) =>
  ({ kind: 'failed', site, reading: 'issues', chosen }) as const;

// The header the Issue tracker's list has (`plugins/issue-tracker/filter-page-header.ts`), with Jira's Filter menu.
const issuesHeader = (
  { project, people }: Issues,
  framing: Framing,
  listing: Listing,
): Omit<PluginProps['Screen'], 'children'> => ({
  title: project.name,
  search: { label: 'Search Issues' },
  value: listing.filters.text,
  onChangeText: listing.to.bind('text'),
  actions: [filterMenu(people, listing), ...projectActions(framing)],
});

type Drawing = { framing: Framing; listing: Listing };

// What the list says in place of its rows: why Jira refused them, or why there are none.
const emptyOf = (
  view: Issues,
  refused: JiraFailure | undefined,
  { framing, listing }: Drawing,
): JSX.Element =>
  refused
    ? refusedList(view, refused, framing)
    : emptyList(view.project.key, listing);

// Under the rows the list names its Jira project and site, as the Issue tracker names its repository.
const listFrame = (
  view: Issues,
  refused: JiraFailure | undefined,
  drawing: Drawing,
): ListFrame => ({
  footer: `${view.project.key} · ${view.site.host}`,
  empty: emptyOf(view, refused, drawing),
});

// The project's issues the filters leave; load more reads the next page from Jira's cursor.
function issueScreen(
  view: Issues,
  refused: JiraFailure | undefined,
  { framing, listing }: Drawing,
): JSX.Element {
  const frame = listFrame(view, refused, { framing, listing });

  return (
    <Screen {...issuesHeader(view, framing, listing)}>
      {issueList(view.site, { list: listing.list, to: framing.to, ...frame })}
    </Screen>
  );
}

// Why Jira refused the list's first page, if it did.
const refusalIn = ({ list }: Listing): JiraFailure | undefined =>
  list.items.find(isFailure)?.failed;

// The list, or a refused token's way to sign in again in its place.
function issues(view: Issues, framing: Framing, listing: Listing): JSX.Element {
  const refused = refusalIn(listing);

  if (refused && refused.kind === 'signed-out')
    return setupScreen(
      { kind: 'signed-out', message: refused.message },
      framing,
    );

  return issueScreen(view, refused, { framing, listing });
}

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: Framing,
  listing: Listing,
): JSX.Element {
  if (view.kind === 'issues') return issues(view, framing, listing);

  return view.kind === 'failed'
    ? failedScreen(view, framing)
    : setupScreen(view, framing);
}
