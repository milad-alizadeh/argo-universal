import type { ProjectInfo } from '@repo/contracts';
import { Action } from '@repo/kit/primitives/actions/action';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import {
  Screen,
  type ScreenProps,
} from '@repo/kit/primitives/scaffolds/screen';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type * as React from 'react';
import { useState } from 'react';
import type {
  ProjectListViewProps,
  ProjectsLoad,
  SearchedProps,
} from './project-list-props';
import { LoadedProjects } from './project-list-rows';
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

/*
 * A failed load keeps the skeleton: the toast says why, and the query retries when the Connection reopens.
 * Loading or failed, the page draws the card it will show with no Projects in it, so the List stands in for
 * itself with rows of its own. The phones draw those rows themselves rather than as their grouped list, which
 * holds only FieldGroup rows, so the rows a Project lands on are a row's height but not a grouped row's.
 */
function ProjectsBody(props: SearchedProps): React.JSX.Element {
  const { projects } = props;
  const loading = projects.status !== 'loaded';

  useErrorToast(projects.status === 'error' ? loadFailed : undefined);

  return (
    <Skeleton fill loading={loading} accessibilityLabel="Loading Projects">
      <LoadedProjects
        {...props}
        loading={loading}
        projects={foundProjects(projects)}
      />
    </Skeleton>
  );
}

const noProjects: ProjectInfo[] = [];

const foundProjects = (projects: ProjectsLoad): ProjectInfo[] =>
  projects.status === 'loaded' ? projects.projects : noProjects;
