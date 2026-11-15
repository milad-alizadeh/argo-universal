import {
  Action,
  Button,
  Callout,
  EmptyState,
  FieldGroup,
  Screen,
  Stack,
  Text,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueList } from './issue-rows';
import type { JiraFailure, JiraProject } from './jira-client';
import type { ProjectView } from './jira-setup';
import type { JiraSite } from './jira-store';
import { signInPath } from './sign-in-page';

// What a site picker types before it is added: Page state, as it is no secret.
export type ProjectState = { site: string };

export type ProjectTo = PageTo<ProjectState>;

// What every view of one Argo Project knows besides Jira's answer.
export type Framing = {
  projectId: string;
  to: ProjectTo;
  state: ProjectState;
  sitePath: string;
};

const swapIcon = {
  sf: 'arrow.left.arrow.right',
  material: 'swap_horiz',
} as const;

function signedOut(message: string | null, { to }: Framing): JSX.Element {
  return (
    <Screen title="Jira">
      <EmptyState
        title="Sign in to Jira"
        description={
          message ??
          'Sign in with a scoped Atlassian API token to see this Project’s Jira issues.'
        }
        action={<Button label="Sign in" onPress={to.go(signInPath)} />}
      />
    </Screen>
  );
}

// The sites Argo has found, with a check on the one in use, and a field that finds another by its address.
export function sitePicker(
  sites: JiraSite[],
  chosen: string,
  { projectId, to, state }: Framing,
): JSX.Element {
  return (
    <FieldGroup>
      {sites.length > 0 && (
        <FieldGroup.Section key="sites" title="Your sites">
          <FieldGroup.Picker
            key="site"
            title="Site"
            presentation="inline"
            value={chosen}
            options={sites.map(({ cloudId, host }) => ({
              value: cloudId,
              label: host,
            }))}
            onValueChange={to.run('chooseSite', {
              cloudId: to.payload(),
              projectId,
            })}
          />
        </FieldGroup.Section>
      )}
      <FieldGroup.Section
        key="add"
        title="Add a site"
        footer="The address you open Jira at, such as your-team.atlassian.net."
      >
        <FieldGroup.TextField
          key="address"
          title="Site"
          value={state.site}
          placeholder="your-team.atlassian.net"
          keyboardType="url"
          onChangeText={to.bind('site')}
        />
        <FieldGroup.Link
          key="add-site"
          title="Add site"
          action
          onPress={to.run('addSite', { site: state.site, projectId })}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function noSite(sites: JiraSite[], framing: Framing): JSX.Element {
  return (
    <Screen title="Choose a Jira site">
      <Stack direction="column" gap={6}>
        <Text role="secondary">
          {sites.length > 0
            ? 'Which Atlassian site holds this Project’s issues?'
            : 'Add the Atlassian site that holds this Project’s issues.'}
        </Text>
        {sitePicker(sites, '', framing)}
      </Stack>
    </Screen>
  );
}

const changeSite = ({ to, sitePath }: Framing): JSX.Element => (
  <Action
    key="change-site"
    label="Change Jira site"
    icon={{ sf: 'globe', material: 'language' }}
    onPress={to.go(sitePath)}
  />
);

function noProjects(site: JiraSite, framing: Framing): JSX.Element {
  return (
    <EmptyState
      title={`No Jira projects on ${site.host}`}
      description="Your Atlassian account can’t see any Jira projects on this site. Choose another site, or ask a Jira admin for access."
      action={
        <Button
          label="Choose another site"
          onPress={framing.to.go(framing.sitePath)}
        />
      }
    />
  );
}

function projectPicker(
  site: JiraSite,
  projects: JiraProject[],
  { projectId, to }: Framing,
): JSX.Element {
  return (
    <FieldGroup>
      <FieldGroup.Section
        key="projects"
        title={`Jira projects on ${site.host}`}
      >
        <FieldGroup.Picker
          key="project"
          title="Jira project"
          presentation="inline"
          value=""
          options={projects.map(({ key, name }) => ({
            value: key,
            label: name,
            subtitle: key,
          }))}
          onValueChange={to.run('chooseProject', {
            cloudId: site.cloudId,
            key: to.payload(),
            projectId,
          })}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function noProject(
  site: JiraSite,
  projects: JiraProject[],
  framing: Framing,
): JSX.Element {
  return (
    <Screen
      title="Choose a Jira project"
      caption={site.host}
      actions={changeSite(framing)}
    >
      {projects.length === 0 ? (
        noProjects(site, framing)
      ) : (
        <Stack direction="column" gap={6}>
          <Text role="secondary">
            Which Jira project does this Project show?
          </Text>
          {projectPicker(site, projects, framing)}
        </Stack>
      )}
    </Screen>
  );
}

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this project',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read Jira',
};

function failed(
  site: JiraSite,
  failure: JiraFailure,
  framing: Framing,
): JSX.Element {
  const { to, projectId } = framing;

  return (
    <Screen title="Jira" caption={site.host} actions={changeSite(framing)}>
      <Stack direction="column" gap={6}>
        <Callout
          tone="danger"
          title={failureTitles[failure.kind]}
          description={failure.message}
        />
        <Button label="Try again" onPress={to.run('checkAgain', {})} />
        <Button
          label="Choose another Jira project"
          variant="secondary"
          onPress={to.run('forgetProject', { projectId })}
        />
      </Stack>
    </Screen>
  );
}

const projectActions = (framing: Framing): JSX.Element[] => [
  <Action
    key="change-project"
    label="Change Jira project"
    icon={swapIcon}
    onPress={framing.to.run('forgetProject', { projectId: framing.projectId })}
  />,
  changeSite(framing),
];

function issues(
  view: Extract<ProjectView, { kind: 'issues' }>,
  framing: Framing,
): JSX.Element {
  const { site, project, page } = view;

  return (
    <Screen
      title={project.name}
      caption={`${project.key} · ${site.host}`}
      width="full"
      actions={projectActions(framing)}
    >
      {page.issues.length === 0 ? (
        <EmptyState
          title={`No issues in ${project.key}`}
          description="Issues created in this Jira project show here."
        />
      ) : (
        issueList(site, page.issues, framing.to)
      )}
    </Screen>
  );
}

// The page one Argo Project's Jira shows: the step it is at, saying what to do next.
export function projectScreen(
  view: ProjectView,
  framing: Framing,
): JSX.Element {
  switch (view.kind) {
    case 'signed-out':
      return signedOut(view.message, framing);
    case 'no-site':
      return noSite(view.sites, framing);
    case 'no-project':
      return noProject(view.site, view.projects, framing);
    case 'failed':
      return failed(view.site, view.failure, framing);
    case 'issues':
      return issues(view, framing);
  }
}
