import type { AgentLoginOperation, AgentLoginSnapshot } from '@repo/contracts';
import {
  skipToken,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';
import { ongoingLogin } from '../components/agent-login-sheet/login-copy';

const pollMs = 500;

const statusOf = (
  snapshot: AgentLoginSnapshot | undefined,
): AgentLoginSnapshot['status'] => snapshot?.status ?? 'starting';

const interval = (snapshot: AgentLoginSnapshot | undefined): number | false =>
  ongoingLogin(statusOf(snapshot)) ? pollMs : false;

// The sign-in's snapshot from the query cache, polled while the sheet is open and the sign-in is ongoing.
export function useLoginSnapshot(
  operation: AgentLoginOperation | undefined,
  open: boolean,
): UseQueryResult<AgentLoginSnapshot, ClientError> {
  const query = useQuery(
    useTRPC().agents.login.queryOptions(operation ?? skipToken, {
      enabled: open,
      refetchInterval: (polled) => interval(polled.state.data),
      staleTime: 0,
    }),
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
    void cache.invalidateQueries(trpc.agents.check.pathFilter());
  }, [snapshot, cache, trpc]);
}
