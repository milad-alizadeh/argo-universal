import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import type { LoadedProps } from './project-list-props';

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
      <GroupedList>
        <ProjectRows {...props} found={found} searching={query !== ''} />
      </GroupedList>
    </View>
  );
}

const countTitle = (count: number): string =>
  count === 1 ? '1 Project' : `${count} Projects`;

function ProjectRows(props: FoundProps): React.JSX.Element {
  if (props.found.length === 0)
    return <NoProjects searching={props.searching} />;

  return <FoundProjects {...props} />;
}

function NoProjects({ searching }: { searching: boolean }): React.JSX.Element {
  return (
    <GroupedListSection>
      <GroupedListItem
        label={searching ? 'No Project matches.' : 'No Projects yet.'}
      />
    </GroupedListSection>
  );
}

function FoundProjects({
  found,
  onOpenProject,
}: FoundProps): React.JSX.Element {
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

type ProjectRowProps = {
  project: ProjectInfo;
  onOpen: (name: string) => void;
};

function ProjectRow(props: ProjectRowProps): React.JSX.Element {
  return (
    <>
      <SizeClass only="wide">
        <ProjectRowItem {...props} wide />
      </SizeClass>
      <SizeClass only="compact">
        <ProjectRowItem {...props} wide={false} />
      </SizeClass>
    </>
  );
}

// One line at every width: the folder path sits only on the Project's own page.
function ProjectRowItem(
  props: ProjectRowProps & { wide: boolean },
): React.JSX.Element {
  return (
    <GroupedListItem
      icon="folder"
      label={props.project.name}
      {...projectDetail(props.project, props.wide)}
      onPress={() => props.onOpen(props.project.name)}
    />
  );
}
