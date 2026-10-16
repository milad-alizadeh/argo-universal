import type { AgentRemovalInput } from '@repo/contracts';
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';

export type AgentManagement = {
  install: (id: string) => void;
  remove: (id: string) => void;
};

type Mutations = {
  install: UseMutationResult<void, ClientError, { id: string }>;
  remove: UseMutationResult<void, ClientError, AgentRemovalInput>;
};

function useServerInvalidation(): () => Promise<void> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return () => cache.invalidateQueries(trpc.agents.servers.queryFilter());
}

function useAgentMutations(onInstalled?: (id: string) => void): Mutations {
  const trpc = useTRPC(),
    invalidate = useServerInvalidation();

  const installed = async (_: void, { id }: { id: string }): Promise<void> => {
    onInstalled?.(id);
    await invalidate();
  };

  const install = useMutation(
    trpc.agents.addRegistry.mutationOptions({ onSuccess: installed }),
  );

  const remove = useMutation(
    trpc.agents.remove.mutationOptions({ onSuccess: invalidate }),
  );

  return { install, remove };
}

export function useAgentManagement(
  onInstalled?: (id: string) => void,
): AgentManagement {
  const { install, remove } = useAgentMutations(onInstalled);
  const failure = install.error ?? remove.error;
  useErrorToast(
    failure
      ? { title: 'Could not change Agent', message: failure.message }
      : undefined,
  );

  return {
    install: (id) => install.mutate({ id }),
    remove: (id) => remove.mutate({ id }),
  };
}
