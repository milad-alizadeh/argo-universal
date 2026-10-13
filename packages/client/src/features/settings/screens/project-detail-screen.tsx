import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import {
  type ProjectLoad,
  ProjectDetailView,
} from '../components/project-detail-view/project-detail-view';
import { useProjects } from '../hooks/use-projects';
import { useServerPageCaption } from '../hooks/use-server-caption';

export interface ProjectDetailScreenProps {
  name: string;
}

function toProjectLoad(
  projects: ProjectInfo[] | undefined,
  name: string,
): ProjectLoad {
  if (!projects) return { status: 'loading' };
  const project = projects.find((entry) => entry.name === name);

  return project ? { status: 'loaded', project } : { status: 'missing' };
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <ProjectDetailView
      name={name}
      caption={useServerPageCaption()}
      project={toProjectLoad(useProjects().data, name)}
      onBack={() => navigate({ to: 'settings-projects' })}
    />
  );
}
