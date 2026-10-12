import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '#lib/generic/primitives/buttons/icon-button/icon-button';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import {
  type ErrorToast,
  useErrorToast,
} from '#lib/generic/primitives/overlays/toast/toast';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SettingsPage } from '#lib/product/settings-page';
import type { ListItemProps } from '../../../../lib/generic/primitives/fields/field-props';
import type { ListSearchBarProps } from '../../../../lib/generic/primitives/inputs/list-search-bar/list-search-bar';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

export type ProjectsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; projects: ProjectInfo[] };

export interface ProjectListViewProps {
  caption?: string;
  projects: ProjectsLoad;
  onOpenProject: (name: string) => void;
  // Where the search starts, for stories.
  initialSearch?: string;
}
type SearchedProps = ProjectListViewProps & {
  search: string;
  onSearch: (search: string) => void;
};
type LoadedProps = Omit<SearchedProps, 'projects'> & {
  projects: ProjectInfo[];
};

const searchLabel = 'Search Projects';

// The Server's Projects, found by name or folder; each opens its own page.
export function ProjectListView(
  props: ProjectListViewProps,
): React.JSX.Element {
  const [search, setSearch] = useState(props.initialSearch ?? '');
  return (
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <PhoneHeader onSearch={setSearch} />
      <SettingsPage
        title="Projects"
        caption={props.caption}
        actions={<AddProject />}
        search={{ label: searchLabel, value: search, onChangeText: setSearch }}
      >
        <ProjectsBody {...props} search={search} onSearch={setSearch} />
      </SettingsPage>
    </View>
  );
}

function PhoneHeader({
  onSearch,
}: {
  onSearch: (search: string) => void;
}): React.JSX.Element | null {
  if (useWide()) return null;
  return (
    <ScreenHeader
      title="Projects"
      search={{
        placeholder: searchLabel,
        onChangeText: onSearch,
      }}
    />
  );
}

// The Server cannot add a Project from the App yet.
function AddProject(): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      size="sm"
      icon="add"
      iconSize="md"
      iconClassName="text-muted-foreground"
      accessibilityLabel="Add Project"
      disabled
    />
  );
}

// The Projects page is pushed from Settings, so a back button leads its header.
const listSearch = (
  props: Pick<SearchedProps, 'search' | 'onSearch'>,
): ListSearchBarProps => ({
  placeholder: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
  leading: 'back',
});

const loadFailed: ErrorToast = {
  title: 'Could not load Projects',
  message: 'The Server did not send its Projects.',
};

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function ProjectsBody(props: SearchedProps): React.JSX.Element {
  useErrorToast(props.projects.status === 'error' ? loadFailed : undefined);
  return (
    <FieldList search={listSearch(props)} sections={projectSections(props)} />
  );
}

const loadingSection: FieldListSection = {
  rows: [<ListItem key="loading" title="Loading Projects…" loading />],
};

function projectSections(props: SearchedProps): FieldListSection[] {
  const { projects } = props;
  if (projects.status !== 'loaded') return [loadingSection];
  return [loadedSection({ ...props, projects: projects.projects })];
}

const matches = (project: ProjectInfo, search: string): boolean =>
  [project.name, project.path].some((text) =>
    text.toLowerCase().includes(search),
  );

const countTitle = (count: number): string =>
  count === 1 ? '1 Project' : `${count} Projects`;

// The Projects the search finds under their count, or a row that says none did.
function loadedSection(props: LoadedProps): FieldListSection {
  const query = props.search.trim().toLowerCase();
  const found = props.projects.filter((project) => matches(project, query));
  if (found.length === 0)
    return { rows: [<ListItem key="empty" title={emptyTitle(query)} />] };
  return {
    title: countTitle(found.length),
    rows: found.map((project) => (
      <ProjectRow
        key={project.id}
        project={project}
        onOpen={() => props.onOpenProject(project.name)}
      />
    )),
  };
}

const emptyTitle = (query: string): string =>
  query === '' ? 'No Projects yet.' : 'No Project matches.';

const folderNotFound = 'Folder not found';
const missingFolder: ListItemProps['status'] = {
  tone: 'warning',
  label: folderNotFound,
};

// Where the Project's remote is, or that its folder is gone: a phone shows only the dot, which the row's name still says.
function projectDetail(
  project: ProjectInfo,
  wide: boolean,
): Pick<ListItemProps, 'value' | 'status'> {
  if (!project.folderExists)
    return { value: wide ? folderNotFound : undefined, status: missingFolder };
  return { value: project.remoteHost ?? 'No remote' };
}

// One line at every width: the folder path sits only on the Project's own page.
function ProjectRow(props: {
  project: ProjectInfo;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <ListItem
      icon="folder"
      title={props.project.name}
      {...projectDetail(props.project, useWide())}
      onPress={props.onOpen}
    />
  );
}
