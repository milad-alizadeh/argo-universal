import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConnectionState,
  useTRPC,
  type ServerMutation,
  type TRPC,
} from '#features/connection';
import type {
  AgentAccessDetailViewProps,
  AgentAccessLoad,
} from './agent-access-detail-view';

type Controls = Omit<AgentAccessDetailViewProps, 'caption' | 'onBack'>;

interface AccessQuery {
  data?: { enabled: boolean };
  isError: boolean;
  refetch: () => void;
}

interface Sources {
  access: AccessQuery;
  change: ServerMutation<TRPC['agent']['setAccess']>;
  install: ServerMutation<TRPC['agent']['installInstructions']>;
}

export function useAgentAccess(): Controls {
  const trpc = useTRPC();
  const access = useQuery(trpc.agent.getAccess.queryOptions());
  const change = useAccessChange();
  const install = useMutation(trpc.agent.installInstructions.mutationOptions());
  const state = loadState(useConnectionState() === 'open', access);

  return { access: state, ...controlState({ access, change, install }) };
}

function useAccessChange(): Sources['change'] {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return useMutation(
    trpc.agent.setAccess.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.agent.getAccess.queryKey(), data),
    }),
  );
}

function controlState(sources: Sources): Omit<Controls, 'access'> {
  const { access, change, install } = sources;

  return {
    saving: change.isPending,
    installing: install.isPending,
    installed: installedState(install.data),
    error: mutationError(sources),
    onEnabledChange: (enabled) => change.mutate({ enabled }),
    onInstall: () => install.mutate(),
    onRetry: () => {
      void access.refetch();
    },
  };
}

function installedState(
  data: { updated: boolean } | undefined,
): Controls['installed'] {
  if (!data) return undefined;

  return data.updated ? 'updated' : 'written';
}

function loadState(connected: boolean, query: AccessQuery): AgentAccessLoad {
  if (!connected) return { status: 'disconnected' };

  return connectedState(query);
}

function connectedState(query: AccessQuery): AgentAccessLoad {
  if (query.data) return { status: 'loaded', enabled: query.data.enabled };

  return { status: query.isError ? 'error' : 'loading' };
}

function mutationError({ change, install }: Sources): string | undefined {
  const error = change.error ?? install.error;

  return error?.message;
}
