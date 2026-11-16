import { Button, Callout, Screen, Stack } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraFailure } from './jira-client';
import { activeFilters, noFilters } from './jira-filters';
import type { FailedView } from './jira-setup';
import { changeSite } from './setup-views';
import type { Framing, Listing } from './view-frame';

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this project',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read Jira',
};

// A 404 for the projects list means the site, not a project, is gone.
const titleOf = ({ failure, reading }: FailedView): string =>
  failure.kind === 'not-found' && reading === 'projects'
    ? 'Jira couldn’t find this site'
    : failureTitles[failure.kind];

const anotherProject = {
  label: 'Choose another Jira project',
  variant: 'secondary',
} as const;

// Offered only when the Project chose its Jira project, so forgetting the choice changes what the page shows.
const forgetButton = (
  { chosen }: FailedView,
  { to, projectId }: Framing,
): JSX.Element[] =>
  chosen
    ? [
        <Button
          key="forget"
          {...anotherProject}
          onPress={to.run('forgetProject', { projectId })}
        />,
      ]
    : [];

/*
 * The filters are kept Page state, so a read Jira refuses for them, such as a person who has since left, is refused
 * again on Try again and on going back; clearing them is the way out that keeps the project.
 */
const clearFilters = ({ to, filters }: Listing): JSX.Element[] =>
  activeFilters(filters) === 0
    ? []
    : [
        <Button
          key="clear"
          label="Clear filters"
          variant="secondary"
          onPress={to.set(noFilters)}
        />,
      ];

const failureCallout = (view: FailedView): JSX.Element => (
  <Callout
    tone="danger"
    title={titleOf(view)}
    description={view.failure.message}
  />
);

// The refusal and the ways on from it; the list draws it under its own header, the setup steps under theirs.
export const failureBody = (
  view: FailedView,
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Stack direction="column" gap={6}>
    {failureCallout(view)}
    <Button label="Try again" onPress={framing.to.run('checkAgain', {})} />
    {clearFilters(listing)}
    {forgetButton(view, framing)}
  </Stack>
);

export const failedScreen = (
  view: FailedView,
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Screen title="Jira" caption={view.site.host} actions={changeSite(framing)}>
    {failureBody(view, framing, listing)}
  </Screen>
);
