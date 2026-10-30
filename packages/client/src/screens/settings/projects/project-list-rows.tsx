import type { ProjectInfo } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import type { LoadedProps } from './project-list-props';

type FoundProps = Pick<LoadedProps, 'onOpenProject' | 'loading'> & {
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
    <ProjectsColumn>
      {projectRows({ ...props, found, searching: query !== '' })}
    </ProjectsColumn>
  );
}

// The Projects' card, its place on the page the List's own.
function ProjectsColumn(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <List appearance="grouped" fit={false}>
      {props.children}
    </List>
  );
}

function projectRows(props: FoundProps): React.JSX.Element {
  if (props.found.length > 0) return foundProjects(props);

  // Inside the Skeleton an empty Section draws the placeholder rows the loaded ones land on.
  return props.loading ? <List.Section /> : noProjects(props.searching);
}

function noProjects(searching: boolean): React.JSX.Element {
  return (
    <List.Section>
      <FieldGroup.Value
        title={searching ? 'No Project matches.' : 'No Projects yet.'}
        value=""
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
    <List.Section>
      {found.map((project) => projectRow({ project, ...row }))}
    </List.Section>
  );
}

// A row shows its name alone; only a missing folder adds a word, as the page it opens can't load.
const projectValue = (project: ProjectInfo): string | undefined =>
  project.folderExists ? undefined : 'Folder not found';

type ProjectRowProps = {
  project: ProjectInfo;
  onOpen: (name: string) => void;
};

/*
 * A Settings row like every other: the folder path sits only on the Project's own page. It is the FieldGroup row
 * itself, not a component around it, so a grouped List on iOS or Android sees a row it can draw natively.
 */
function projectRow(props: ProjectRowProps): React.JSX.Element {
  return (
    <FieldGroup.Link
      key={props.project.id}
      leading="folder"
      title={props.project.name}
      value={projectValue(props.project)}
      onPress={() => props.onOpen(props.project.name)}
    />
  );
}
