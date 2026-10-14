import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import type { ListItemProps } from '#primitives/fields/field-props';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { ListItem } from '#primitives/lists/list-item/list-item';
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
      <FieldGroup search={listSearch(props)}>
        <ProjectRows {...props} found={found} searching={query !== ''} />
      </FieldGroup>
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
    <FieldSection>
      <ListItem
        title={searching ? 'No Project matches.' : 'No Projects yet.'}
      />
    </FieldSection>
  );
}

function FoundProjects({
  found,
  onOpenProject,
}: FoundProps): React.JSX.Element {
  return (
    <FieldSection title={countTitle(found.length)}>
      {found.map((project) => (
        <ProjectRow key={project.id} project={project} onOpen={onOpenProject} />
      ))}
    </FieldSection>
  );
}

const folderNotFound = 'Folder not found';

const missingFolder: ListItemProps['status'] = {
  tone: 'warning',
  label: folderNotFound,
};

type ProjectDetail = Pick<ListItemProps, 'value' | 'status'>;

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
    <ListItem
      icon="folder"
      title={props.project.name}
      {...projectDetail(props.project, useWide())}
      onPress={() => props.onOpen(props.project.name)}
    />
  );
}
