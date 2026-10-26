import {
  EmptyState,
  Icon,
  List,
  ListItem,
  Screen,
  useState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { repositoryText, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import {
  builtInGroups,
  filterGroups,
  type FilterGroup,
  type IssueFilter,
} from './issue-filters';
import { useOverview, type Overview } from './use-overview';
import { useProjects } from './use-projects';

type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
  choose: (id: string) => void;
};

type RootView = {
  deps: IssueDeps;
  project: Project;
  overview: Overview | null;
};

/*
 * The Issues section's landing page: GitHub's own ways to group a repository's Issues, by status, by
 * you and by label. Each row opens that filter's list.
 */
export function IssuesRoot({ deps }: { deps: IssueDeps }): JSX.Element {
  return (
    <Screen title="Issues">
      <RootList deps={deps} />
    </Screen>
  );
}

function RootList({ deps }: { deps: IssueDeps }): JSX.Element {
  const choice = useRootProjects(deps);
  const { overview, message, refresh } = useOverview(deps, choice.project);

  return (
    <List
      footer={rootFooter(choice, message)}
      empty={<EmptyState title={choice.message} />}
      onRefresh={refresh}
    >
      {projectSection(choice)}
      {filterSections(deps, choice.project, overview)}
    </List>
  );
}

// The footer names the Project's repository, or the latest load message in its place.
const rootFooter = (
  { project, message }: RootProjects,
  loaded: string,
): string => (project ? loaded || repositoryText(project) : message);

function useRootProjects(deps: IssueDeps): RootProjects {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading Projects…');

  useProjects(deps.listProjects, { setProjects, setProjectId, setMessage });

  return {
    projects,
    project: projects.find((row) => row.id === projectId),
    message,
    choose: setProjectId,
  };
}

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
  return (
    <ListItem
      key={project.id}
      title={project.name}
      selected={project.id === choice.project?.id}
      onPress={() => choice.choose(project.id)}
    />
  );
}

function filterSections(
  deps: IssueDeps,
  project: Project | undefined,
  overview: Overview | null,
): JSX.Element[] {
  if (!project) return [];

  const view = { deps, project, overview };

  return groupsOf(overview).map((group) => (
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
  const path = view.deps.pages.filterHref(view.project, filter);

  return (
    <ListItem
      key={filter.id}
      title={filter.title}
      value={countText(view.overview, filter)}
      leading={<Icon name={filter.icon} size="md" />}
      onPress={{ action: 'navigate', path }}
    />
  );
}
