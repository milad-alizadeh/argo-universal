import { EmptyState, Icon, List, ListDetail, ListItem } from '@argo/plugin-kit';
import type { PluginProps } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Project } from './issue-client';
import { builtInFilters, labelFilter, type IssueFilter } from './issue-filters';
import { filterPath } from './issue-paths';
import { loadingIssues } from './loading-issues';
import type { Overview } from './overview';
import type { ProjectSection, Sidebar, SidebarSelection } from './sidebar';

type RootView = {
  project: Project;
  overview: Overview | null;
  selected?: string;
};

/*
 * The Issues section's pages: each Project's ways to group its Issues in the sidebar, each row opening that filter's
 * list, and the page beside it, such as one Issue.
 */
export function RootPage(props: {
  rows: JSX.Element;
  detail?: JSX.Element | null;
}): JSX.Element {
  return (
    <ListDetail
      title="Issues"
      list={props.rows}
      detail={props.detail ?? undefined}
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

// The sidebar's rows; a pull draws the page again with its Queries read fresh.
export type RootRowsProps = {
  sidebar: Sidebar;
  onRefresh: PluginProps['List']['onRefresh'];
  selected?: SidebarSelection;
};

/*
 * One folding List section per Project with a Tracker, as the Sessions list groups its Sessions: GitHub's own ways to list
 * its Issues, by status and by you, then its labels under one row.
 */
export function RootRows(props: RootRowsProps): JSX.Element {
  const { sidebar } = props;

  return (
    <List
      empty={<EmptyState title={sidebar.message || loadingIssues} />}
      onRefresh={props.onRefresh}
    >
      {sidebar.sections.map((section) =>
        projectSection(section, viewOf(section, props.selected)),
      )}
    </List>
  );
}

// A section's rows, with the page's filter selected when the page is for its Project.
const viewOf = (
  { project, overview }: ProjectSection,
  selected: SidebarSelection | undefined,
): RootView => ({
  project,
  overview,
  selected: selected?.projectId === project.id ? selected.filterId : undefined,
});

// A section's footer says why its overview could not be read.
function projectSection(section: ProjectSection, view: RootView): JSX.Element {
  return (
    <List.Section
      key={section.project.id}
      title={section.project.name}
      footer={section.message || undefined}
      collapsible
    >
      {builtInFilters().map((filter) => filterRow(view, filter))}
      {labelsRow(view, section.overview?.labels)}
    </List.Section>
  );
}

// The labels arrive with the overview; until then, or for a repository with none, the row is left out.
function labelsRow(
  view: RootView,
  labels: readonly string[] = [],
): JSX.Element | null {
  if (labels.length === 0) return null;

  return (
    <ListItem
      key="labels"
      title="Labels"
      leading={<Icon name={{ sf: 'tag', material: 'label' }} size="md" />}
    >
      {labels.map((label) => filterRow(view, labelFilter(label)))}
    </ListItem>
  );
}

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
