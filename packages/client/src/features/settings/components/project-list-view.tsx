import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { SettingsPage } from '#lib/product/settings-page';
import { FieldGroup } from '#primitives/field-group';
import { FieldSection } from '#primitives/field-section';
import { IconButton } from '#primitives/icon-button';
import { ListItem } from '#primitives/list-item';
import { type ErrorToast, useErrorToast } from '#primitives/toast';
import type { ListItemProps } from '../../../lib/generic/primitives/field-props';
import { useWide } from '../../../lib/generic/use-wide';

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
type SearchedProps = ProjectListViewProps & { search: string };
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
    <View className="flex-1 bg-background wide:bg-transparent">
      <PhoneHeader onSearch={setSearch} />
      <SettingsPage
        title="Projects"
        caption={props.caption}
        actions={<AddProject />}
        search={{ label: searchLabel, value: search, onChangeText: setSearch }}
      >
        <ProjectsBody {...props} search={search} />
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
      search={{ placeholder: searchLabel, onChangeText: onSearch }}
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
      <FieldGroup>
        <FieldSection>
          <ListItem title="Loading Projects…" loading />
        </FieldSection>
      </FieldGroup>
    );
  return <LoadedProjects {...props} projects={projects.projects} />;
}

const matches = (project: ProjectInfo, search: string): boolean =>
  [project.name, project.path].some((text) =>
    text.toLowerCase().includes(search),
  );

function LoadedProjects(props: LoadedProps): React.JSX.Element {
  const query = props.search.trim().toLowerCase();
  const found = props.projects.filter((project) => matches(project, query));
  return (
    <View className="flex-1 pt-2 wide:pt-0">
      <FieldGroup>
        <ProjectRows {...props} found={found} searching={query !== ''} />
      </FieldGroup>
    </View>
  );
}

const countTitle = (count: number): string =>
  count === 1 ? '1 Project' : `${count} Projects`;

function ProjectRows({
  found,
  searching,
  onOpenProject,
}: LoadedProps & {
  found: ProjectInfo[];
  searching: boolean;
}): React.JSX.Element {
  if (found.length === 0)
    return (
      <FieldSection>
        <ListItem
          title={searching ? 'No Project matches.' : 'No Projects yet.'}
        />
      </FieldSection>
    );
  return (
    <FieldSection title={countTitle(found.length)}>
      {found.map((project) => (
        <ProjectRow
          key={project.id}
          project={project}
          onOpen={() => onOpenProject(project.name)}
        />
      ))}
    </FieldSection>
  );
}

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
