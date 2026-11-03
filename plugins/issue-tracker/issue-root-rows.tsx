import { EmptyState, Icon, List, ListItem } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  builtInGroups,
  filterGroups,
  type FilterGroup,
  type IssueFilter,
} from './issue-filters';
import { filterPath, projectPath } from './issue-paths';
import { repositoryText, type Project } from './issue-project';
import type { Overview, OverviewState } from './use-overview';
import type { RootProjects } from './use-root-projects';

type RootView = {
  project: Project;
  overview: Overview | null;
  selected?: string;
};

type RootRowsProps = {
  choice: RootProjects;
  state: OverviewState;
  selected?: string;
};

export function RootRows(props: RootRowsProps): JSX.Element {
  const { choice, state } = props;

  return (
    <List
      footer={rootFooter(choice, state.message)}
      empty={<EmptyState title={choice.message} />}
      onRefresh={state.refresh}
    >
      {projectSection(choice)}
      {filterSections(props)}
    </List>
  );
}

// The footer names the Project's repository, or the latest load message in its place.
const rootFooter = (
  { project, message }: RootProjects,
  loaded: string,
): string => (project ? loaded || repositoryText(project) : message);

// A Project to group Issues of, only when there is a choice.
function projectSection(choice: RootProjects): JSX.Element | null {
  if (choice.projects.length < 2) return null;

  return (
    <List.Section key="projects" title="Project">
      {choice.projects.map((project) => projectRow(choice, project))}
    </List.Section>
  );
}

function projectRow(choice: RootProjects, project: Project): JSX.Element {
  const path = projectPath(project.id);

  return (
    <ListItem
      key={project.id}
      title={project.name}
      selected={project.id === choice.project?.id}
      onPress={{ action: 'navigate', path }}
    />
  );
}

function filterSections(props: RootRowsProps): JSX.Element[] {
  const { choice, state, selected } = props;
  const project = choice.project;

  if (!project) return [];

  const view = { project, overview: state.overview, selected };

  return groupsOf(state.overview).map((group) => (
    <List.Section key={group.title} title={group.title}>
      {group.filters.map((filter) => filterRow(view, filter))}
    </List.Section>
  ));
}

// The labels arrive with the overview; until then the built-in groups show alone.
const groupsOf = (overview: Overview | null): readonly FilterGroup[] =>
  overview ? filterGroups(overview.labels) : builtInGroups;

const countText = (
  overview: Overview | null,
  filter: IssueFilter,
): string | undefined => {
  const count = overview?.counts[filter.id];

  return count === undefined ? undefined : String(count);
};

// A keyed ListItem itself, as a List draws its children, not a component that returns one.
function filterRow(view: RootView, filter: IssueFilter): JSX.Element {
  const path = filterPath(view.project.id, filter);

  return (
    <ListItem
      key={filter.id}
      title={filter.title}
      selected={filter.id === view.selected}
      value={countText(view.overview, filter)}
      leading={<Icon name={filter.icon} size="md" />}
      onPress={{ action: 'navigate', path }}
    />
  );
}
