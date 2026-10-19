import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { Page, PageColumn, type PageProps } from '#primitives/scaffolds/page';
import { Spinner } from '#primitives/status/spinner';
import type { ProjectListViewProps, SearchedProps } from './project-list-props';
import { LoadedProjects } from './project-list-rows';
import { pageSearch, projectsTitle } from './project-list-search';

// The Server's Projects, found by name or folder; each opens its own page.
export function ProjectListView(
  props: ProjectListViewProps,
): React.JSX.Element {
  const [search, setSearch] = useState(props.initialSearch ?? '');

  return <ProjectsPage {...props} search={search} onSearch={setSearch} />;
}

function ProjectsPage(props: SearchedProps): React.JSX.Element {
  return (
    <Page {...pageProps(props)}>
      <ProjectCaption caption={props.caption} />
      <ProjectsBody {...props} />
    </Page>
  );
}

function pageProps(props: SearchedProps): PageProps {
  return {
    title: projectsTitle,
    primaryAction: addProject,
    search: { label: pageSearch(props).label },
    value: props.search,
    onChangeText: props.onSearch,
  };
}

function ProjectCaption({ caption }: { caption?: string }): React.ReactNode {
  if (!caption) return null;

  return (
    <PageColumn>
      <View className="hidden pb-6 wide:flex">
        <Text tone="muted">{caption}</Text>
      </View>
    </PageColumn>
  );
}

const addProject = {
  label: 'Add Project',
  icon: 'add',
  disabled: true,
  onPress: unavailable,
} as const;

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

function LoadingProjects(): React.JSX.Element {
  return (
    <List appearance="grouped">
      <List.Section>
        <ListItem
          title="Loading Projects…"
          leading={<Spinner accessibilityLabel="Loading Projects" />}
        />
      </List.Section>
    </List>
  );
}
