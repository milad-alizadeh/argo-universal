import type { AgentLoginSnapshot } from '@repo/contracts';
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';
import { ongoingLogin } from '../components/agent-login-sheet/login-copy';
import { loginIdentity, type OwnedLogin } from './login-operation';

const pollMs = 500;

const noOperation = { operationId: '', ownerToken: '' };

const statusOf = (
  snapshot: AgentLoginSnapshot | undefined,
): AgentLoginSnapshot['status'] => snapshot?.status ?? 'starting';

const interval = (snapshot: AgentLoginSnapshot | undefined): number | false =>
  ongoingLogin(statusOf(snapshot)) ? pollMs : false;

export function useLoginSnapshot(
  operation: OwnedLogin | undefined,
  open: boolean,
): UseQueryResult<AgentLoginSnapshot, ClientError> {
  const query = useQuery(
    useTRPC().agents.login.queryOptions(
      queryIdentity(operation),
      snapshotOptions(operation, open),
    ),
  );

  useRefreshReadiness(query.data);

  return query;
}

function useRefreshReadiness(snapshot: AgentLoginSnapshot | undefined): void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  useEffect(() => {
    if (!snapshot || ongoingLogin(snapshot.status)) return;
    void cache
      .fetchQuery(
        trpc.agents.list.queryOptions({ refresh: true }, { staleTime: 0 }),
      )
      .then((agents) => cache.setQueryData(trpc.agents.list.queryKey(), agents))
      .catch(() => {});
  }, [snapshot, cache, trpc]);
}

const queryIdentity = (
  operation: OwnedLogin | undefined,
): ReturnType<typeof loginIdentity> =>
  operation ? loginIdentity(operation) : noOperation;

function snapshotOptions(
  operation: OwnedLogin | undefined,
  open: boolean,
): SnapshotOptions {
  return {
    enabled: open && !!operation,
    initialData: operation?.snapshot,
    refetchInterval: (query: {
      state: { data: AgentLoginSnapshot | undefined };
    }): number | false => interval(query.state.data),
    staleTime: 0,
  };
}

type SnapshotOptions = {
  enabled: boolean;
  initialData: AgentLoginSnapshot | undefined;
  refetchInterval: (query: {
    state: { data: AgentLoginSnapshot | undefined };
  }) => number | false;
  staleTime: number;
};
