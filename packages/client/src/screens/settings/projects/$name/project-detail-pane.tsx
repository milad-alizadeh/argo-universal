import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useProjects } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginOpener } from '../../../plugins/use-plugin-opener';
import { useProjectDetailsItems } from '../../../plugins/use-project-details';
import {
  type ProjectDetailViewProps,
  type ProjectLoad,
  ProjectDetailView,
} from './project-detail-view';
import { selectProject } from './select-project';
import { useProjectAccounts } from './use-project-accounts';

function toProjectLoad(
  projects: ProjectInfo[] | undefined,
  name: string,
  projectId: string | undefined,
): ProjectLoad {
  if (!projects) return { status: 'loading' };
  const project = selectProject(projects, name, projectId);

  return project ? { status: 'loaded', project } : { status: 'missing' };
}

function useProjectDetail(
  name: string,
  projectId: string | undefined,
): ProjectDetailViewProps {
  const project = toProjectLoad(useProjects().data, name, projectId);

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
export function ProjectDetailPane(props: {
  name: string;
  projectId?: string;
}): React.JSX.Element {
  const detail = useProjectDetail(props.name, props.projectId);

  return detail.project.status === 'loaded' ? (
    <LoadedProjectDetail
      detail={detail}
      projectId={detail.project.project.id}
    />
  ) : (
    <ProjectDetailView {...detail} />
  );
}

type LoadedProps = { detail: ProjectDetailViewProps; projectId: string };

// Asks the Slot only for a loaded Project, as the Server has no Project to answer for before then.
function LoadedProjectDetail({
  detail,
  projectId,
}: LoadedProps): React.JSX.Element {
  const open = usePluginOpener();

  return (
    <ProjectDetailView
      {...detail}
      pluginItems={useProjectDetailsItems(projectId)}
      onOpenPluginPage={(pluginId, path) => open(pluginId, { projectId })(path)}
    />
  );
}
