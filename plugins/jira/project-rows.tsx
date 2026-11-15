import { EmptyState, Icon, List, ListItem } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { projectPath } from './jira-paths';

export type ArgoProject = { id: string; name: string };

const issuesIcon = { sf: 'list.bullet', material: 'list' } as const;

const noProjects = (
  <EmptyState
    title="No Projects"
    description="Add a Project to Argo to see its Jira issues."
  />
);

// Each Argo Project's views of its Jira issues; the board joins the list here.
const projectSection = (
  project: ArgoProject,
  selected: string | undefined,
): JSX.Element => (
  <List.Section key={project.id} title={project.name}>
    <ListItem
      key="issues"
      title="Issues"
      leading={<Icon name={issuesIcon} size="md" />}
      selected={project.id === selected}
      onPress={{ action: 'navigate', path: projectPath(project.id) }}
    />
  </List.Section>
);

// The section list, with the views of the Project the page is for selected.
export const projectRows = (
  projects: ArgoProject[],
  selected?: string,
): JSX.Element => (
  <List accessibilityLabel="Projects" empty={noProjects}>
    {projects.map((project) => projectSection(project, selected))}
  </List>
);

export const chooseProject = (
  <EmptyState
    title="Choose a Project"
    description="Pick a Project to see the Jira issues it tracks."
  />
);
