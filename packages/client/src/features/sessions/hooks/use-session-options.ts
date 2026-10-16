import type { SessionConfigOption } from '@repo/contracts';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  skipToken,
  type UndefinedInitialDataOptions,
  useIsRestoring,
  useQuery,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import type { SavedChoices } from '#lib/product/session-configuration';
import {
  chosenOptions,
  type ConfigurationPicks,
} from '../state/session-option-choices';

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
interface SessionOptionsOwner {
  agent: string;
  projectId: string;
}

// Written from Session snapshots, never fetched.
export const sessionOptionsQuery = (
  agent: string,
  projectId: string,
): SessionOptionsQuery =>
  queryOptions({
    queryKey: [sessionOptionsKey, agent, projectId] as const,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

export function writeSessionOptions(
  client: QueryClient,
  { agent, projectId }: SessionOptionsOwner,
  configOptions: SessionConfigOption[],
): void {
  client.setQueryData(
    sessionOptionsQuery(agent, projectId).queryKey,
    configOptions,
  );
}

export interface SessionOptionsChoice {
  agent: string | undefined;
  projectId: string | undefined;
  saved: SavedChoices;
  picks: ConfigurationPicks;
  // True while New Session opens its Local Session.
  opening: boolean;
}

export interface SessionOptions {
  configOptions: SessionConfigOption[];
  // Only on this Device's first Session for the Agent and Project; then the cache shows at once.
  loading: boolean;
}

// The cached options with the reader's choices over them; nothing cached yet shows the Agent's defaults.
export const sessionOptions = (
  cached: SessionConfigOption[] | undefined,
  { saved, picks, opening }: Omit<SessionOptionsChoice, 'agent' | 'projectId'>,
): SessionOptions => ({
  configOptions: cached ? chosenOptions(cached, saved, picks) : [],
  loading: cached === undefined && opening,
});

interface CachedOptions {
  cached: SessionConfigOption[] | undefined;
  // While the persisted cache restores, nobody knows yet whether it holds options.
  restoring: boolean;
}

const useCached = (
  agent: string | undefined,
  projectId: string | undefined,
): CachedOptions => ({
  cached: useQuery(sessionOptionsQuery(agent ?? '', projectId ?? '')).data,
  restoring: useIsRestoring(),
});

// New Session's model, effort and mode at once, before any Session opens.
export function useSessionOptions(
  choice: SessionOptionsChoice,
): SessionOptions {
  const { agent, projectId, saved, picks } = choice;
  const { cached, restoring } = useCached(agent, projectId);
  const opening = choice.opening && !restoring;

  // The same options while nothing changes, so the screen's effects run only on a change.
  return useMemo(
    () => sessionOptions(cached, { saved, picks, opening }),
    [cached, saved, picks, opening],
  );
}
