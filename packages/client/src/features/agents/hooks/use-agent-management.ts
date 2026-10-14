import type {
  ConfiguredAgent,
  AgentId,
  AgentEnablementInput,
} from '@repo/contracts';
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';
import type { AgentManagement } from '../state/agent-management-types';
import { useConfiguredAgents } from './use-configured-agents';

type Commands = {
  remove: UseMutationResult<void, ClientError, AgentId>;
  enable: UseMutationResult<void, ClientError, AgentEnablementInput>;
};

function useManagementMutations(onRemoved: () => void): Commands {
  const trpc = useTRPC(),
    cache = useQueryClient();

  const invalidate = (): Promise<void> =>
    cache.invalidateQueries(trpc.agents.pathFilter());

  const onSuccess = removalComplete(onRemoved, invalidate);

  return {
    remove: useMutation(trpc.agents.remove.mutationOptions({ onSuccess })),
    enable: useMutation(
      trpc.agents.setEnabled.mutationOptions({ onSuccess: invalidate }),
    ),
  };
}

function presentation(
  agent: ConfiguredAgent | undefined,
  commands: Commands,
): AgentManagement | undefined {
  if (!agent) return undefined;

  if (agent.configuration.removed) return undefined;

  return managementPresentation(agent, commands);
}

const managementPresentation = (
  agent: ConfiguredAgent,
  commands: Commands,
): AgentManagement => {
  const { remove, enable } = commands,
    agentId = agent.id;

  return {
    enabled: agent.enabled,
    busy: remove.isPending || enable.isPending,
    onRemove: () => remove.mutate({ agentId }),
    failure: remove.error?.message,
    onDismissFailure: remove.reset,
    onEnabledChange: (enabled) => enable.mutate({ agentId, enabled }),
  };
};

export function useAgentManagement(
  agentId: string,
  onRemoved: () => void,
): AgentManagement | undefined {
  const configured = useConfiguredAgents(),
    commands = useManagementMutations(onRemoved);

  const agent = configured.data?.find(({ id }) => id === agentId);
  useRemovedCustom(agent, onRemoved);
  useEnablementFailure(commands.enable.error);

  return presentation(agent, commands);
}

const removedCustom = (agent: ConfiguredAgent | undefined): boolean =>
  agent?.configuration.source === 'custom' &&
  agent.configuration.removed === true;

function useRemovedCustom(
  agent: ConfiguredAgent | undefined,
  onRemoved: () => void,
): void {
  const removed = removedCustom(agent);
  useEffect(() => {
    if (removed) onRemoved();
  }, [removed, onRemoved]);
}

function useEnablementFailure(error: ClientError | null): void {
  useErrorToast(
    error
      ? { title: 'Could not change Agent', message: error.message }
      : undefined,
  );
}

const removalComplete =
  (
    onRemoved: () => void,
    invalidate: () => Promise<void>,
  ): (() => Promise<void>) =>
  async () => {
    onRemoved();
    await invalidate();
  };
