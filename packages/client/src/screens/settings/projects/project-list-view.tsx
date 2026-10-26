import { Action } from '@repo/kit/primitives/actions/action';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import {
  type LoadingRow,
  loadingRows,
} from '@repo/kit/primitives/lists/list-item';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import {
  Screen,
  type ScreenProps,
} from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { ProjectListViewProps, SearchedProps } from './project-list-props';
import { LoadedProjects, ProjectsColumn } from './project-list-rows';
import { projectsTitle, searchLabel } from './project-list-search';

// The Server's Projects, found by name or folder; each opens its own page.
export function ProjectListView(
  props: ProjectListViewProps,
): React.JSX.Element {
  const [search, setSearch] = useState(props.initialSearch ?? '');

  return <ProjectsPage {...props} search={search} onSearch={setSearch} />;
}

function ProjectsPage(props: SearchedProps): React.JSX.Element {
  return (
    <Screen {...screenProps(props)}>
      <ProjectsBody {...props} />
    </Screen>
  );
}

function screenProps(props: SearchedProps): ScreenProps {
  return {
    title: projectsTitle,
    caption: props.caption,
    primaryAction: addProject,
    search: { label: searchLabel },
    value: props.search,
    onChangeText: props.onSearch,
  };
}

const addProject = (
  <Action label="Add Project" icon="add" disabled onPress={unavailable} />
);

// The Server cannot add a Project from the App yet.
function unavailable(): void {}

const loadFailed: ErrorToast = {
  title: 'Could not load Projects',
  message: 'The Server did not send its Projects.',
};

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function ProjectsBody(props: SearchedProps): React.JSX.Element {
  const { projects } = props;
  useErrorToast(projects.status === 'error' ? loadFailed : undefined);

  if (projects.status !== 'loaded') return <LoadingProjects />;

  return <LoadedProjects {...props} projects={projects.projects} />;
}

// Widths, not words: a Project row is its folder icon, its name and its remote, so these stand in for them.
const loadingProjects: LoadingRow[] = [
  { title: 'Argo Universal' },
  { title: 'Server' },
  { title: 'Plugin kit' },
];

const loadingRow = <FieldGroup.Value title="Loading…" value="" />;

// The native list on iOS and Android holds only FieldGroup rows, so it waits on one; the web draws the rows' shapes.
const waiting = (): React.JSX.Element | React.JSX.Element[] =>
  Platform.OS === 'web' ? loadingRows(loadingProjects) : loadingRow;

// The loading rows stand in the one card the loaded ones fill.
function LoadingProjects(): React.JSX.Element {
  return (
    <ProjectsColumn>
      <List.Section>{waiting()}</List.Section>
    </ProjectsColumn>
  );
}
