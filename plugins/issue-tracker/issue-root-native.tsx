import { EmptyState, FieldGroup, List } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { filterCountText } from './issue-filter-value';
import { builtInFilters, labelFilter, type IssueFilter } from './issue-filters';
import { filterPath } from './issue-paths';
import type { RootRowsProps } from './issue-root';
import { loadingIssues } from './loading-issues';
import type { ProjectSection } from './sidebar';

// Native FieldGroup rows make this List a SwiftUI List or Compose LazyColumn (ADR-0032's Issues exception).
export function NativeRootRows(
  props: Pick<RootRowsProps, 'sidebar' | 'onRefresh'>,
): JSX.Element {
  return (
    <List
      appearance="grouped"
      onRefresh={props.onRefresh}
      empty={<EmptyState title={props.sidebar.message || loadingIssues} />}
    >
      {props.sidebar.sections.map(projectSection)}
    </List>
  );
}

const projectSection = (section: ProjectSection): JSX.Element => (
  <List.Section
    key={section.project.id}
    title={section.project.name}
    footer={section.message || undefined}
  >
    {builtInFilters().map((filter) => filterRow(section, filter))}
    {labelsRows(section, section.overview?.labels)}
  </List.Section>
);

function labelsRows(
  section: ProjectSection,
  labels: readonly string[] = [],
): JSX.Element | null {
  if (labels.length === 0) return null;

  return (
    <>
      <FieldGroup.Value title="Labels" leading="tag" value="" />
      {labels.map((label) => filterRow(section, labelFilter(label)))}
    </>
  );
}

const filterRow = (
  section: ProjectSection,
  filter: IssueFilter,
): JSX.Element => (
  <FieldGroup.Link
    key={filter.id}
    title={filter.title}
    leading={filter.icon}
    value={filterCountText(section.overview, filter)}
    onPress={{
      action: 'navigate',
      path: filterPath(section.project.id, filter),
    }}
  />
);
