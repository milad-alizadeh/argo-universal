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

  return () => cache.invalidateQueries(trpc.agents.servers.queryFilter());
}

export interface AgentChanges {
  install: (id: string) => void;
  remove: (id: string) => void;
}

function useInstall(
  onInstalled?: (id: string) => void,
): UseMutationResult<void, ClientError, { id: string }> {
  const invalidate = useInstalledInvalidation();

  const onSuccess = async (_: void, { id }: { id: string }): Promise<void> => {
    onInstalled?.(id);
    await invalidate();
  };

  return useMutation(
    useTRPC().agents.addRegistry.mutationOptions({ onSuccess }),
  );
}

function useRemove(): UseMutationResult<void, ClientError, RegistryAgentId> {
  const onSuccess = useInstalledInvalidation();

  return useMutation(useTRPC().agents.remove.mutationOptions({ onSuccess }));
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
