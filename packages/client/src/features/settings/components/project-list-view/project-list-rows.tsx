import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { LoadedProps } from './project-list-props';
import { listSearch } from './project-list-search';

type FoundProps = Pick<LoadedProps, 'onOpenProject'> & {
  found: ProjectInfo[];
  searching: boolean;
};

const matches = (project: ProjectInfo, search: string): boolean =>
  [project.name, project.path].some((text) =>
    text.toLowerCase().includes(search),
  );

export function LoadedProjects(props: LoadedProps): React.JSX.Element {
  const query = props.search.trim().toLowerCase();
  const found = props.projects.filter((project) => matches(project, query));

  return (
    <View className="flex-1 pt-2 wide:pt-0">
      <GroupedList search={listSearch(props)}>
        {projectSection({ ...props, found, searching: query !== '' })}
      </GroupedList>
    </View>
  );
}

const countTitle = (count: number): string =>
  count === 1 ? '1 Project' : `${count} Projects`;

// GroupedList takes its section as a direct child, so this is called rather than rendered.
function noProjectsSection(searching: boolean): React.JSX.Element {
  return (
    <GroupedListSection>
      <GroupedListItem
        label={searching ? 'No Project matches.' : 'No Projects yet.'}
      />
    </GroupedListSection>
  );
}

function projectSection({
  found,
  searching,
  onOpenProject,
}: FoundProps): React.JSX.Element {
  if (found.length === 0) return noProjectsSection(searching);

  return (
    <GroupedListSection title={countTitle(found.length)}>
      {found.map((project) => (
        <ProjectRow key={project.id} project={project} onOpen={onOpenProject} />
      ))}
    </GroupedListSection>
  );
}

const folderNotFound = 'Folder not found';

const missingFolder: GroupedListItemProps['status'] = {
  tone: 'warning',
  label: folderNotFound,
};

type ProjectDetail = Pick<GroupedListItemProps, 'value' | 'status'>;

const missingFolderDetail = (wide: boolean): ProjectDetail => ({
  value: wide ? folderNotFound : undefined,
  status: missingFolder,
});

// Where the Project's remote is, or that its folder is gone: a phone shows only the dot, which the row's name still says.
function projectDetail(project: ProjectInfo, wide: boolean): ProjectDetail {
  if (!project.folderExists) return missingFolderDetail(wide);

  return { value: project.remoteHost ?? 'No remote' };
}

// One line at every width: the folder path sits only on the Project's own page.
function ProjectRow(props: {
  project: ProjectInfo;
  onOpen: (name: string) => void;
}): React.JSX.Element {
  return (
    <GroupedListItem
      icon="folder"
      label={props.project.name}
      {...projectDetail(props.project, useWide())}
      onPress={() => props.onOpen(props.project.name)}
    />
  );
}
