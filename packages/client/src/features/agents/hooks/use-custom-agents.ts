import type {
  AgentCheck,
  AgentRegistration,
  ConfiguredAgent,
  CustomAgentDefinition,
} from '@repo/contracts';
import {
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ClientError } from '#features/connection';
import { useTRPC } from '#features/connection';

export type CustomAgent = {
  id: string;
  enabled: boolean;
  definition: CustomAgentDefinition;
};

const toCustomAgent = ({
  id,
  enabled,
  configuration,
}: ConfiguredAgent): CustomAgent[] =>
  configuration.source === 'custom'
    ? [{ id, enabled, definition: configuration.definition }]
    : [];

export function useCustomAgents(): UseQueryResult<CustomAgent[], ClientError> {
  return useQuery({
    ...useTRPC().agents.configured.queryOptions(),
    select: (agents) => agents.flatMap(toCustomAgent),
  });
}

// Readiness comes from a fresh ACP initialize on the Server each time it is asked.
export function useAgentCheck(
  agentId: string,
  enabled: boolean,
): UseQueryResult<AgentCheck, ClientError> {
  return useQuery(
    useTRPC().agents.check.queryOptions({ agentId }, { staleTime: 0, enabled }),
  );
}

function useAgentsInvalidation(): () => Promise<void> {
  const trpc = useTRPC();
  const cache = useQueryClient();
  return () => cache.invalidateQueries(trpc.agents.pathFilter());
}

type CustomAgentMutations = {
  register: (definition: CustomAgentDefinition) => Promise<AgentRegistration>;
  edit: (
    agentId: string,
    definition: CustomAgentDefinition,
  ) => Promise<AgentRegistration>;
};

function useRegisterCustom(): CustomAgentMutations['register'] {
  const onSuccess = useAgentsInvalidation();
  const mutation = useMutation(
    useTRPC().agents.registerCustom.mutationOptions({ onSuccess }),
  );
  return (definition) => mutation.mutateAsync(definition);
}

function useEditCustom(): CustomAgentMutations['edit'] {
  const onSuccess = useAgentsInvalidation();
  const mutation = useMutation(
    useTRPC().agents.editCustom.mutationOptions({ onSuccess }),
  );
  return (agentId, definition) => mutation.mutateAsync({ agentId, definition });
}

export function useCustomAgentMutations(): CustomAgentMutations {
  return {
    register: useRegisterCustom(),
    edit: useEditCustom(),
  };
}
