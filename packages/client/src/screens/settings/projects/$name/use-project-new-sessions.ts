import type { ProjectInfo, ProjectUpdateInput } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC, type ServerMutation, type TRPC } from '#features/connection';
import type { ProjectNewSessionsControls } from './project-detail-new-sessions';

interface ProjectUpdate {
  update: (input: ProjectUpdateInput) => void;
  pending: ProjectUpdateInput | undefined;
}

interface ProjectNewSessions {
  // The Project as the page draws it, with the change on its way to the Server.
  project: ProjectInfo;
  controls: ProjectNewSessionsControls;
}

function useUpdateMutation(): ServerMutation<TRPC['project']['update']> {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: (updated) =>
        cache.setQueryData(trpc.project.list.queryKey(), (projects) =>
          projects?.map((listed) =>
            listed.id === updated.id ? { ...listed, ...updated } : listed,
          ),
        ),
    }),
  );
}

function useProjectUpdate(): ProjectUpdate {
  const change = useUpdateMutation();

  useErrorToast(errorToast('Could not change the Project', change.error));

  return {
    update: change.mutate,
    pending: change.isPending ? change.variables : undefined,
  };
}

// A refused change falls back to what the Server holds.
const withPending = (
  project: ProjectInfo,
  pending: ProjectUpdateInput | undefined,
): ProjectInfo => ({ ...project, ...pending, id: project.id });

// A Project whose folder is gone has no branches to ask for.
function useProjectBranches(
  projectId: string,
  enabled: boolean,
): ProjectNewSessionsControls['branches'] {
  const trpc = useTRPC();

  return useQuery(
    trpc.project.listBranches.queryOptions({ projectId }, { enabled }),
  ).data;
}

const rowChanges = (
  projectId: string,
  update: ProjectUpdate['update'],
): Omit<ProjectNewSessionsControls, 'branches'> => ({
  onCheckoutChoiceChange: (checkoutChoice) =>
    update({ projectId, checkoutChoice }),
  onDeleteWorktreeOnArchiveChange: (deleteWorktreeOnArchive) =>
    update({ projectId, deleteWorktreeOnArchive }),
});

// A quick edit: it shows at once, and a failure is a toast.
export function useProjectNewSessions(
  project: ProjectInfo,
): ProjectNewSessions {
  const { update, pending } = useProjectUpdate();

  return {
    project: withPending(project, pending),
    controls: {
      branches: useProjectBranches(project.id, project.folderExists),
      ...rowChanges(project.id, update),
    },
  };
}
