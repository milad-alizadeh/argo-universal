import type { ProjectInfo } from '@repo/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import type * as React from 'react';
import { useProjects, useServerPageCaption } from '#features/settings';
import { projectHref, useNavigate } from '#lib/product/navigation/navigation';
import type { ProjectsLoad } from './project-list-props';
import { ProjectListView } from './project-list-view';

function toProjectsLoad(
  projects: UseQueryResult<ProjectInfo[], unknown>,
): ProjectsLoad {
  if (projects.data) return { status: 'loaded', projects: projects.data };

  if (projects.isError) return { status: 'error' };

  return { status: 'loading' };
}

// The Projects list, marking the Project whose page is open beside it.
export function ProjectListPane(props: {
  selected?: string;
}): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <ProjectListView
      caption={useServerPageCaption()}
      projects={toProjectsLoad(useProjects())}
      selected={props.selected}
      onOpenProject={(name) => navigate(projectHref(name))}
    />
  );
}
