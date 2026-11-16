import {
  Action,
  Button,
  EmptyState,
  FieldGroup,
  Screen,
  Stack,
  Text,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraProject } from './jira-readers';
import type { ProjectView } from './jira-setup';
import type { JiraSite } from './jira-store';
import { signInPath } from './sign-in-page';
import { sitePicker } from './site-picker';
import type { Framing } from './view-frame';

const signedOutText =
  'Sign in with a scoped Atlassian API token to see this Project’s Jira issues.';

const signedOut = (message: string | null, { to }: Framing): JSX.Element => (
  <Screen title="Jira">
    <EmptyState
      title="Sign in to Jira"
      description={message ?? signedOutText}
      action={<Button label="Sign in" onPress={to.go(signInPath)} />}
    />
  </Screen>
);

const siteQuestion = (sites: JiraSite[]): string =>
  sites.length > 0
    ? 'Which Atlassian site holds this Project’s issues?'
    : 'Add the Atlassian site that holds this Project’s issues.';

const noSite = (sites: JiraSite[], framing: Framing): JSX.Element => (
  <Screen title="Choose a Jira site">
    <Stack direction="column" gap={6}>
      <Text role="secondary">{siteQuestion(sites)}</Text>
      {sitePicker({ sites, chosen: '' }, framing)}
    </Stack>
  </Screen>
);

export const changeSite = ({ to, sitePath }: Framing): JSX.Element => (
  <Action
    key="change-site"
    label="Change Jira site"
    icon={{ sf: 'globe', material: 'language' }}
    onPress={to.go(sitePath)}
  />
);

const noProjects = (site: JiraSite, { to, sitePath }: Framing): JSX.Element => (
  <EmptyState
    title={`No Jira projects on ${site.host}`}
    description="Your Atlassian account can’t see any Jira projects on this site. Choose another site, or ask a Jira admin for access."
    action={<Button label="Choose another site" onPress={to.go(sitePath)} />}
  />
);

type ProjectOption = { value: string; label: string; subtitle: string };

const projectOption = ({ key, name }: JiraProject): ProjectOption => ({
  value: key,
  label: name,
  subtitle: key,
});

const projectPickerProps = (
  site: JiraSite,
  projects: JiraProject[],
  { projectId, to }: Framing,
): PluginProps['FieldGroup.Picker'] => ({
  title: 'Jira project',
  presentation: 'inline',
  value: '',
  options: projects.map(projectOption),
  onValueChange: to.run('chooseProject', {
    cloudId: site.cloudId,
    key: to.payload(),
    projectId,
  }),
});

const projectPicker = (
  site: JiraSite,
  projects: JiraProject[],
  framing: Framing,
): JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section key="projects" title={`Jira projects on ${site.host}`}>
      <FieldGroup.Picker
        key="project"
        {...projectPickerProps(site, projects, framing)}
      />
    </FieldGroup.Section>
  </FieldGroup>
);

const projectQuestion = (
  site: JiraSite,
  projects: JiraProject[],
  framing: Framing,
): JSX.Element => (
  <Stack direction="column" gap={6}>
    <Text role="secondary">Which Jira project does this Project show?</Text>
    {projectPicker(site, projects, framing)}
  </Stack>
);

type NoProject = Extract<ProjectView, { kind: 'no-project' }>;

const noProject = (
  { site, projects }: NoProject,
  framing: Framing,
): JSX.Element => (
  <Screen
    title="Choose a Jira project"
    caption={site.host}
    actions={changeSite(framing)}
  >
    {projects.length === 0
      ? noProjects(site, framing)
      : projectQuestion(site, projects, framing)}
  </Screen>
);

export type SetupView = Extract<
  ProjectView,
  { kind: 'signed-out' | 'no-site' | 'no-project' }
>;

// The steps before there are issues to show, each saying what to do next.
export function setupScreen(view: SetupView, framing: Framing): JSX.Element {
  if (view.kind === 'signed-out') return signedOut(view.message, framing);

  return view.kind === 'no-site'
    ? noSite(view.sites, framing)
    : noProject(view, framing);
}
