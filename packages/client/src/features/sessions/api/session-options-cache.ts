import type {
  SessionAgentOptionsInput,
  SessionConfigOption,
} from '@repo/contracts';
import {
  type DataTag,
  type QueryClient,
  type QueryFunction,
  queryOptions,
  skipToken,
  type UndefinedInitialDataOptions,
} from '@tanstack/react-query';
import type { useTRPCClient } from '#features/connection';

// The only query this Device persists between App launches.
export const sessionOptionsKey = 'sessionOptions';

type SessionOptionsKey = readonly [typeof sessionOptionsKey, string, string];

type SessionOptionsQuery = UndefinedInitialDataOptions<
  SessionConfigOption[],
  Error,
  SessionConfigOption[],
  SessionOptionsKey
> & { queryKey: DataTag<SessionOptionsKey, SessionConfigOption[], Error> };

// Whose options a cache entry holds: the last opened Session of this Agent in this Project.
export type SessionOptionsOwner = SessionAgentOptionsInput;

type ReadOptions = QueryFunction<SessionConfigOption[], SessionOptionsKey>;

// Written from Session snapshots; read from the Server only for a New worktree's never-opened Agent (ADR-0023).
export const sessionOptionsQuery = (
  { agent, projectId }: SessionOptionsOwner,
  read: ReadOptions | typeof skipToken = skipToken,
): SessionOptionsQuery =>
  queryOptions({
    queryKey: [sessionOptionsKey, agent, projectId] as const,
    queryFn: read,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

// The Server opens an Agent session in the Project folder, reads its options and closes it.
export const readAgentOptions =
  (
    client: ReturnType<typeof useTRPCClient>,
    owner: SessionOptionsOwner,
  ): ReadOptions =>
  ({ signal }) =>
    client.session.agentOptions.query(owner, { signal });

export function writeSessionOptions(
  client: QueryClient,
  owner: SessionOptionsOwner,
  configOptions: SessionConfigOption[],
): void {
  client.setQueryData(sessionOptionsQuery(owner).queryKey, configOptions);
}
