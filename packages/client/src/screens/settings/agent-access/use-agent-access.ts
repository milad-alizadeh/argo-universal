import type { OperationGrant } from '@repo/contracts/operations';
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
  todoList: AccessQuery;
  grants: { data?: OperationGrant[]; refetch: () => void };
  change: ServerMutation<TRPC['agent']['setAccess']>;
  changeTodoList: ServerMutation<TRPC['agent']['setTodoList']>;
  revoke: ServerMutation<TRPC['agent']['revokeGrant']>;
  install: ServerMutation<TRPC['agent']['installInstructions']>;
}

export function useAgentAccess(): Controls {
  const trpc = useTRPC();
  const access = useQuery(trpc.agent.getAccess.queryOptions());
  const todoList = useQuery(trpc.agent.getTodoList.queryOptions());
  const grants = useOperationGrants();
  const change = useAccessChange();
  const changeTodoList = useTodoListChange();
  const install = useMutation(trpc.agent.installInstructions.mutationOptions());
  const state = loadState(useConnectionState() === 'open', access);

  const sources = {
    access,
    todoList,
    ...grants,
    change,
    changeTodoList,
    install,
  };

  return { access: state, ...controlState(sources) };
}

function useTodoListChange(): Sources['changeTodoList'] {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return useMutation(
    trpc.agent.setTodoList.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.agent.getTodoList.queryKey(), data),
    }),
  );
}

function useOperationGrants(): Pick<Sources, 'grants' | 'revoke'> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  // Read again whenever Settings opens, since a Permission answer elsewhere adds grants.
  const grants = useQuery({
    ...trpc.agent.listGrants.queryOptions(),
    refetchOnMount: 'always',
  });

  const revoke = useMutation(
    trpc.agent.revokeGrant.mutationOptions({
      onSuccess: () =>
        cache.invalidateQueries({ queryKey: trpc.agent.listGrants.queryKey() }),
    }),
  );

  return { grants, revoke };
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
  const { access, todoList, grants, change, changeTodoList, revoke, install } =
    sources;

  return {
    ...progress(sources),
    todoList: todoList.data?.enabled,
    grants: grants.data,
    onRevokeGrant: ({ projectId, operationId, targetProjectId }) =>
      revoke.mutate({ projectId, operationId, targetProjectId }),
    onTodoListChange: (enabled) => changeTodoList.mutate({ enabled }),
    onEnabledChange: (enabled) => change.mutate({ enabled }),
    onInstall: () => install.mutate(),
    onRetry: () => {
      access.refetch();
      todoList.refetch();
      grants.refetch();
    },
  };
}

// What the mutations are doing, and what the last one said.
const progress = (
  sources: Sources,
): Pick<Controls, 'saving' | 'installing' | 'installed' | 'error'> => ({
  saving: [sources.change, sources.changeTodoList].some(
    ({ isPending }) => isPending,
  ),
  installing: sources.install.isPending,
  installed: installedState(sources.install.data),
  error: mutationError(sources),
});

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

function mutationError(sources: Sources): string | undefined {
  const failed = [
    sources.change,
    sources.changeTodoList,
    sources.revoke,
    sources.install,
  ].find(({ error }) => error);

  return failed?.error?.message;
}
