import { Button, EmptyState, Screen, type PluginProps } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { failedScreen, titleOf } from './failure-view';
import { boardOf } from './issue-board';
import { issueOptions, optionsBadge } from './issue-options';
import { isFailure } from './issue-pages';
import { issueList, type ListFrame } from './issue-rows';
import type { JiraFailure } from './jira-client';
import { activeFilters, cleared } from './jira-filters';
import type { ProjectView } from './jira-setup';
import { projectMenu } from './project-menu';
import { setupScreen } from './setup-views';
import type { Framing, Listing } from './view-frame';

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
    action={<Button label="Clear filters" onPress={to.set(cleared)} />}
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

/*
 * The issues' header (Paper, "Project header on phone", options C and E): the title picks the Jira project, one
 * Options button holds the view, the filters and the order, and the search narrows by text. A phone shows only Options
 * and Search beside the title; a wide window names the project's key and site under it.
 */
const issuesHeader = (
  view: Issues,
  framing: Framing,
  listing: Listing,
): Omit<PluginProps['Screen'], 'children'> => ({
  title: view.project.name,
  caption: `${view.project.key} · ${view.site.host}`,
  titleMenu: projectMenu(view, framing),
  options: issueOptions(view.people, listing),
  optionsBadge: optionsBadge(listing),
  search: { label: 'Search Issues' },
  value: listing.filters.text,
  onChangeText: listing.to.bind('text'),
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

/*
 * The list's frame is its empty state: the header names the Jira project and site, in the caption on a wide window and
 * at the head of the title's menu on every window, so no footer repeats them under the rows.
 */
const listFrame = (
  view: Issues,
  refused: JiraFailure | undefined,
  drawing: Drawing,
): ListFrame => ({ empty: emptyOf(view, refused, drawing) });

// The issues the filters leave as a list, whose load more reads Jira's next page.
function listBody(
  view: Issues,
  refused: JiraFailure | undefined,
  { framing, listing }: Drawing,
): JSX.Element {
  const frame = listFrame(view, refused, { framing, listing });
  const { to, projectId } = framing;

  return issueList(view.site, { list: listing.list, to, projectId, ...frame });
}

// The board the options ask for, or, when Jira refused the list or there is nothing to draw, the list that says why.
function shownBody(
  view: Issues,
  refused: JiraFailure | undefined,
  drawing: Drawing,
): JSX.Element {
  const board = refused ? null : boardOf(drawing.framing, drawing.listing);

  return board ?? listBody(view, refused, drawing);
}

// The project's issues the filters leave, as the list or the board the header's options show.
function issueScreen(
  view: Issues,
  refused: JiraFailure | undefined,
  drawing: Drawing,
): JSX.Element {
  return (
    <Screen {...issuesHeader(view, drawing.framing, drawing.listing)}>
      {shownBody(view, refused, drawing)}
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
