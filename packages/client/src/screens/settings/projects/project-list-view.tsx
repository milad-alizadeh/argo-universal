import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { IconButton } from '#primitives/buttons/icon-button';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import type { ProjectListViewProps, SearchedProps } from './project-list-props';
import { LoadedProjects } from './project-list-rows';
import { pageSearch, projectsTitle } from './project-list-search';

// The Server's Projects, found by name or folder; each opens its own page.
export function ProjectListView(
  props: ProjectListViewProps,
): React.JSX.Element {
  const [search, setSearch] = useState(props.initialSearch ?? '');

  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      {props.renderHeader?.({ onSearch: setSearch })}
      <ProjectsPage {...props} search={search} onSearch={setSearch} />
    </View>
  );
}

function ProjectsPage(props: SearchedProps): React.JSX.Element {
  return (
    <SettingsPage
      title={projectsTitle}
      caption={props.caption}
      actions={<AddProject />}
      search={pageSearch(props)}
    >
      <ProjectsBody {...props} />
    </SettingsPage>
  );
}

// The Server cannot add a Project from the App yet.
function AddProject(): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      size="xs"
      icon="add"
      iconRole="action"
      iconClassName="text-muted-foreground"
      accessibilityLabel="Add Project"
      disabled
    />
  );
}

const loadFailed: ErrorToast = {
  title: 'Could not load Projects',
  message: 'The Server did not send its Projects.',
};

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function ProjectsBody(props: SearchedProps): React.JSX.Element {
  const { projects } = props;
  useErrorToast(projects.status === 'error' ? loadFailed : undefined);

  if (projects.status !== 'loaded')
    return (
      <GroupedList>
        <GroupedListSection>
          <GroupedListItem label="Loading Projects…" loading />
        </GroupedListSection>
      </GroupedList>
    );

  return <LoadedProjects {...props} projects={projects.projects} />;
}
