import type { ProjectInfo } from '@repo/contracts';
import { projectDetailsSlotId } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { useProjects } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginSlot } from '../../../plugins/use-plugin-slot';
import {
  type ProjectDetailViewProps,
  type ProjectLoad,
  ProjectDetailView,
} from './project-detail-view';
import { useProjectAccounts } from './use-project-accounts';

function toProjectLoad(
  projects: ProjectInfo[] | undefined,
  name: string,
): ProjectLoad {
  if (!projects) return { status: 'loading' };
  const project = projects.find((entry) => entry.name === name);

  return project ? { status: 'loaded', project } : { status: 'missing' };
}

function useProjectDetail(name: string): ProjectDetailViewProps {
  const project = toProjectLoad(useProjects().data, name);

  return {
    name,
    project,
    accounts: useProjectAccounts(loadedId(project)),
    onBack: useBackToProjects(),
  };
}

// The Server answers an Account `get` with nothing for an empty id, so Accounts wait for the Project to load.
const loadedId = (project: ProjectLoad): string =>
  project.status === 'loaded' ? project.project.id : '';

function useBackToProjects(): () => void {
  const navigate = useNavigate();

  return () => navigate('/settings/projects');
}

// One Project's page, beside the Projects list on a wide window.
export function ProjectDetailPane({
  name,
}: {
  name: string;
}): React.JSX.Element {
  const detail = useProjectDetail(name);

  return detail.project.status === 'loaded' ? (
    <LoadedProjectDetail
      detail={detail}
      projectId={detail.project.project.id}
    />
  ) : (
    <ProjectDetailView {...detail} />
  );
}

// Watches the Slot only for a loaded Project, as the Server has no Project to answer for before then.
function LoadedProjectDetail({
  detail,
  projectId,
}: {
  detail: ProjectDetailViewProps;
  projectId: string;
}): React.JSX.Element {
  const pluginContributions = usePluginSlot({
    slotId: projectDetailsSlotId,
    context: { projectId },
  });

  return (
    <ProjectDetailView {...detail} pluginContributions={pluginContributions} />
  );
}
