import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useProjects, useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ProjectDetailsSlot } from '../../../plugins/project-details-slot';
import {
  type ProjectDetailViewProps,
  type ProjectLoad,
  ProjectDetailView,
} from './project-detail-view';

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

function useProjectDetail(name: string): ProjectDetailViewProps {
  const navigate = useNavigate();

  return {
    name,
    caption: useServerPageCaption(),
    project: toProjectLoad(useProjects().data, name),
    onBack: () => navigate('/settings/projects'),
    renderPluginSlot: (project) => (
      <ProjectDetailsSlot projectId={project.id} />
    ),
  };
}

export function ProjectDetailScreen({
  name,
}: ProjectDetailScreenProps): React.JSX.Element {
  return <ProjectDetailView {...useProjectDetail(name)} />;
}
