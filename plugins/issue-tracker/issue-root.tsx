import { EmptyState, Icon, List, ListDetail, ListItem } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { repositoryText, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import {
  builtInGroups,
  filterGroups,
  type FilterGroup,
  type IssueFilter,
} from './issue-filters';
import { useOverview, type Overview, type OverviewState } from './use-overview';
import { useRootProjects, type RootProjects } from './use-root-projects';

type RootView = {
  deps: IssueDeps;
  project: Project;
  overview: Overview | null;
  selected?: string;
};

type RootProps = {
  deps: IssueDeps;
  projectId?: string;
  filter?: IssueFilter;
  // The page beside the list, drawn for the Project as it is now.
  detail?: (project: Project) => JSX.Element;
};

/*
 * The Issues section's landing page: GitHub's own ways to group a repository's Issues, by status, by
 * you and by label. Each row opens that filter's list.
 */
export function IssuesRoot({
  detail,
  projectId,
  ...props
}: RootProps): JSX.Element {
  const choice = useRootProjects(props.deps, projectId);

  return (
    <ListDetail
      title="Issues"
      list={<RootList {...props} choice={choice} reload={!detail} />}
      detail={choice.project && detail?.(choice.project)}
      empty={<SelectFilter />}
    />
  );
}

const SelectFilter = (): JSX.Element => (
  <EmptyState
    title="Select a filter"
    description="Choose a group from the sidebar."
  />
);

type RootListProps = Pick<RootProps, 'deps' | 'filter'> & {
  choice: RootProjects;
  reload: boolean;
};

type RootRowsProps = {
  deps: IssueDeps;
  choice: RootProjects;
  state: OverviewState;
  selected?: string;
};

function RootList(props: RootListProps): JSX.Element {
  const { deps, choice, filter, reload } = props;
  const state = useOverview(deps, choice.project, reload);

  return (
    <RootRows deps={deps} choice={choice} state={state} selected={filter?.id} />
  );
}

function RootRows(props: RootRowsProps): JSX.Element {
  const { deps, choice, state } = props;

  return (
    <List
      footer={rootFooter(choice, state.message)}
      empty={<EmptyState title={choice.message} />}
      onRefresh={state.refresh}
    >
      {projectSection(deps, choice)}
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
function projectSection(
  deps: IssueDeps,
  choice: RootProjects,
): JSX.Element | null {
  if (choice.projects.length < 2) return null;

  return (
    <List.Section key="projects" title="Project">
      {choice.projects.map((project) => projectRow(deps, choice, project))}
    </List.Section>
  );
}

function projectRow(
  deps: IssueDeps,
  choice: RootProjects,
  project: Project,
): JSX.Element {
  const path = deps.pages.projectPagePath(project);

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
  const { deps, choice, state, selected } = props;
  const project = choice.project;

  if (!project) return [];

  const view = { deps, project, overview: state.overview, selected };

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
  const path = view.deps.pages.filterPagePath(view.project, filter);

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
