import {
  EmptyState,
  Icon,
  List,
  ListItem,
  type PluginProps,
} from '@argo/plugin-kit';
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

// Each Argo Project's views of its Jira issues, in a folding section as the Issue tracker's sidebar has; the board joins the list here.
const projectSection = (
  project: ArgoProject,
  selected: string | undefined,
): JSX.Element => (
  <List.Section key={project.id} title={project.name} collapsible>
    <ListItem
      key="issues"
      title="Issues"
      leading={<Icon name={issuesIcon} size="md" />}
      selected={project.id === selected}
      onPress={{ action: 'navigate', path: projectPath(project.id) }}
    />
  </List.Section>
);

type Sidebar = {
  selected?: string;
  // A pull draws the page again with its Queries read fresh, as the Issue tracker's sidebar does.
  onRefresh: PluginProps['List']['onRefresh'];
};

// The section list, with the views of the Project the page is for selected.
export const projectRows = (
  projects: ArgoProject[],
  { selected, onRefresh }: Sidebar,
): JSX.Element => (
  <List accessibilityLabel="Projects" empty={noProjects} onRefresh={onRefresh}>
    {projects.map((project) => projectSection(project, selected))}
  </List>
);

export const chooseProject = (
  <EmptyState
    title="Choose a Project"
    description="Pick a Project to see the Jira issues it tracks."
  />
);
