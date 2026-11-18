import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraProject } from './jira-readers';
import type { JiraSite } from './jira-store';
import type { Framing } from './view-frame';

type Shown = { site: JiraSite; project: JiraProject; projects: JiraProject[] };

// One of the site's Jira projects, checked while it is the one shown; choosing another shows its issues.
const projectChoice = (
  { site, project }: Shown,
  each: JiraProject,
  { to, projectId }: Framing,
): JSX.Element => (
  <Action
    key={each.key}
    label={each.name}
    selected={each.key === project.key}
    onPress={to.run('chooseProject', {
      cloudId: site.cloudId,
      key: each.key,
      projectId,
    })}
  />
);

/*
 * The title's menu, where iOS and Android put a scope picker: the site's Jira projects under its address, the shown
 * one checked, then the way to another site.
 */
export const projectMenu = (shown: Shown, framing: Framing): JSX.Element[] => [
  <Action.Section key="projects" title={shown.site.host}>
    {shown.projects.map((each) => projectChoice(shown, each, framing))}
  </Action.Section>,
  <Action.Section key="site">
    <Action
      key="change-site"
      label="Change Jira site…"
      onPress={framing.to.go(framing.sitePath)}
    />
  </Action.Section>,
];
