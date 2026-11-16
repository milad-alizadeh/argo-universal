import {
  Action,
  Button,
  Callout,
  EmptyState,
  Screen,
  Stack,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { filterMenu } from './filter-menu';
import { issueList } from './issue-rows';
import type { JiraFailure } from './jira-client';
import { activeFilters, noFilters } from './jira-filters';
import type { ProjectView } from './jira-setup';
import { changeSite, setupScreen } from './setup-views';
import type { Framing, Listing } from './view-frame';

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this project',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read Jira',
};

const anotherProject = {
  label: 'Choose another Jira project',
  variant: 'secondary',
} as const;

type Failed = Extract<ProjectView, { kind: 'failed' }>;

const failureCallout = (failure: JiraFailure): JSX.Element => (
  <Callout
    tone="danger"
    title={failureTitles[failure.kind]}
    description={failure.message}
  />
);

const failureBody = (
  failure: JiraFailure,
  { to, projectId }: Framing,
): JSX.Element => (
  <Stack direction="column" gap={6}>
    {failureCallout(failure)}
    <Button label="Try again" onPress={to.run('checkAgain', {})} />
    <Button
      {...anotherProject}
      onPress={to.run('forgetProject', { projectId })}
    />
  </Stack>
);

const failed = ({ site, failure }: Failed, framing: Framing): JSX.Element => (
  <Screen title="Jira" caption={site.host} actions={changeSite(framing)}>
    {failureBody(failure, framing)}
  </Screen>
);

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
 * The project's issues the filters leave. The search narrows them once typing pauses and the Filter menu at once,
 * each reading Jira's first page again; load more reads the next one from Jira's cursor.
 */
const issues = (
  { site, project, people }: Issues,
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Screen
    title={project.name}
    caption={`${project.key} · ${site.host}`}
    width="full"
    search={{ label: `Search ${project.key}` }}
    value={listing.filters.text}
    onChangeText={listing.to.bind('text')}
    actions={[filterMenu(people, listing), ...projectActions(framing)]}
  >
    {listing.list.items.length === 0
      ? emptyList(project.key, listing)
      : issueList(site, listing.list, framing.to)}
  </Screen>
);

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: Framing,
  listing: Listing,
): JSX.Element {
  if (view.kind === 'issues') return issues(view, framing, listing);

  return view.kind === 'failed'
    ? failed(view, framing)
    : setupScreen(view, framing);
}
