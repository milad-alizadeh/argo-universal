import type {
  AgentRegistration,
  ConfiguredAgent,
  CustomAgentDefinition,
} from '@repo/contracts';
import {
  type UseQueryResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ClientError } from '#features/connection';
import { useTRPC } from '#features/connection';
import { useConfiguredAgents } from './use-configured-agents';

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
  configuration.source === 'custom' && !configuration.removed
    ? [{ id, enabled, definition: configuration.definition }]
    : [];

export function useCustomAgents(): UseQueryResult<CustomAgent[], ClientError> {
  return useConfiguredAgents((agents) => agents.flatMap(toCustomAgent));
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
