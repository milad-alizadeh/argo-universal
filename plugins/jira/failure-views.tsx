import { Button, Callout, Screen, Stack } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraFailure } from './jira-client';
import { activeFilters, noFilters } from './jira-filters';
import type { JiraSite } from './jira-store';
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

const failureCallout = (failure: JiraFailure): JSX.Element => (
  <Callout
    tone="danger"
    title={failureTitles[failure.kind]}
    description={failure.message}
  />
);

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

const failureBody = (
  failure: JiraFailure,
  { to, projectId }: Framing,
  listing: Listing,
): JSX.Element => (
  <Stack direction="column" gap={6}>
    {failureCallout(failure)}
    <Button label="Try again" onPress={to.run('checkAgain', {})} />
    {clearFilters(listing)}
    <Button
      {...anotherProject}
      onPress={to.run('forgetProject', { projectId })}
    />
  </Stack>
);

const failed = (
  { site, failure }: { site: JiraSite; failure: JiraFailure },
  framing: Framing,
  listing: Listing,
): JSX.Element => (
  <Screen title="Jira" caption={site.host} actions={changeSite(framing)}>
    {failureBody(failure, framing, listing)}
  </Screen>
);

// Why Jira gave no answer: a refused sign-in leads to signing in again, and any other refusal says what Jira said.
export const failedScreen = (
  refusal: { site: JiraSite; failure: JiraFailure },
  framing: Framing,
  listing: Listing,
): JSX.Element =>
  refusal.failure.kind === 'signed-out'
    ? setupScreen(
        { kind: 'signed-out', message: refusal.failure.message },
        framing,
      )
    : failed(refusal, framing, listing);
