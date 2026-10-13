import type { ProjectInfo } from '@repo/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import type { ProjectsLoad } from '../components/project-list-view/project-list-props';
import { ProjectListView } from '../components/project-list-view/project-list-view';
import { useProjects } from '../hooks/use-projects';
import { useServerPageCaption } from '../hooks/use-server-caption';

function toProjectsLoad(
  projects: UseQueryResult<ProjectInfo[], unknown>,
): ProjectsLoad {
  if (projects.data) return { status: 'loaded', projects: projects.data };

  if (projects.isError) return { status: 'error' };

  return { status: 'loading' };
}

export function ProjectListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <ProjectListView
      caption={useServerPageCaption()}
      projects={toProjectsLoad(useProjects())}
      onOpenProject={(name) => navigate({ to: 'settings-project', name })}
    />
  );
}
