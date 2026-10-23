import type { ProjectInfo } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
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
      <List fit={false} appearance="grouped" padding={{ compact: 4, wide: 0 }}>
        {projectRows({ ...props, found, searching: query !== '' })}
      </List>
    </View>
  );
}

const countTitle = (count: number): string =>
  count === 1 ? '1 Project' : `${count} Projects`;

function projectRows(props: FoundProps): React.JSX.Element {
  if (props.found.length === 0) return noProjects(props.searching);

  return foundProjects(props);
}

function noProjects(searching: boolean): React.JSX.Element {
  return (
    <List.Section>
      <ListItem
        title={searching ? 'No Project matches.' : 'No Projects yet.'}
      />
    </List.Section>
  );
}

function foundProjects({
  found,
  onOpenProject,
}: FoundProps): React.JSX.Element {
  const row = { onOpen: onOpenProject };

  return (
    <List.Section title={countTitle(found.length)}>
      {found.map((project) => (
        <ProjectRow key={project.id} project={project} {...row} />
      ))}
    </List.Section>
  );
}

const folderNotFound = 'Folder not found';

const missingFolder: ListItemProps['badge'] = {
  kind: 'status',
  tone: 'warning',
  label: folderNotFound,
};

type ProjectDetail = Pick<ListItemProps, 'value' | 'badge'>;

const missingFolderDetail: ProjectDetail = {
  badge: missingFolder,
  value: folderNotFound,
};

// The Project's remote, or its missing folder, fills the row's value lane.
function projectDetail(project: ProjectInfo, compact?: boolean): ProjectDetail {
  if (!project.folderExists) return missingDetail(compact);

  return { value: project.remoteHost ?? 'No remote' };
}

function missingDetail(compact?: boolean): ProjectDetail {
  return {
    ...missingFolderDetail,
    value: compact ? undefined : folderNotFound,
  };
}

type ProjectRowProps = {
  project: ProjectInfo;
  onOpen: (name: string) => void;
};

// One line at every width: the folder path sits only on the Project's own page.
function ProjectRow(props: ProjectRowProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<ProjectLink {...props} compact />}
      wide={<ProjectLink {...props} />}
    />
  );
}

function ProjectLink(
  props: ProjectRowProps & { compact?: boolean },
): React.JSX.Element {
  const detail = projectDetail(props.project, props.compact);

  return (
    <ListItem.Link
      leading={<Icon name="folder" size="md" />}
      title={props.project.name}
      {...detail}
      accessibilityLabel={`${props.project.name}, ${detail.value ?? folderNotFound}`}
      onPress={() => props.onOpen(props.project.name)}
    />
  );
}
