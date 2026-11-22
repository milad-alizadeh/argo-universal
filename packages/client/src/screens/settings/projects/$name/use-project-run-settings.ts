import type { ProjectInfo } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { ProjectRunSettingsControls } from './project-detail-run-settings';

export function useProjectRunSettings({
  id: projectId,
  folderExists,
}: ProjectInfo): ProjectRunSettingsControls | undefined {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const query = trpc.run.listSettings.queryOptions(
    { projectId },
    { enabled: folderExists },
  );

  const list = useQuery(query);

  const update = useMutation(
    trpc.run.updateSettings.mutationOptions({
      onSuccess: (saved, { name }) =>
        cache.setQueryData(query.queryKey, (entries) =>
          entries?.map((entry) =>
            entry.name === name ? { name, ...saved } : entry,
          ),
        ),
      scope: { id: `run-settings:${projectId}` },
    }),
  );

  useErrorToast(errorToast('Run settings', update.error ?? list.error));

  if (!folderExists || !list.data) return undefined;

  return {
    entries: list.data,
    pending: update.isPending,
    onSave: (name, change) => update.mutate({ projectId, name, ...change }),
  };
}
