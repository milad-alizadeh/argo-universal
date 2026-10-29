import type { RegistryAgentId } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';

// Refetches the Installed Agents after the Server changes them.
export function useInstalledInvalidation(): () => Promise<void> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return () => cache.invalidateQueries(trpc.agent.list.queryFilter());
}

export interface AgentChanges {
  install: (id: string) => void;
  remove: (id: string) => void;
}

function useInstall(
  onInstalled?: (id: string) => void,
): UseMutationResult<null, ClientError, { id: string }> {
  const invalidate = useInstalledInvalidation();

  const onSuccess = async (_: null, { id }: { id: string }): Promise<void> => {
    onInstalled?.(id);
    await invalidate();
  };

  return useMutation(useTRPC().agent.install.mutationOptions({ onSuccess }));
}

function useRemove(): UseMutationResult<null, ClientError, RegistryAgentId> {
  const onSuccess = useInstalledInvalidation();

  return useMutation(useTRPC().agent.remove.mutationOptions({ onSuccess }));
}

// Install saves a Registry Agent on the Server and Remove deletes it; a failure shows one toast.
export function useAgentChanges(
  onInstalled?: (id: string) => void,
): AgentChanges {
  const install = useInstall(onInstalled),
    remove = useRemove();

  const failure = install.error ?? remove.error;
  useErrorToast(errorToast('Could not change Agent', failure));

  return {
    install: (id) => install.mutate({ id }),
    remove: (id) => remove.mutate({ id }),
  };
}
