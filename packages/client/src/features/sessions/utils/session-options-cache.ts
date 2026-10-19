import type { SessionConfigOption } from '@repo/contracts';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  skipToken,
  type UndefinedInitialDataOptions,
} from '@tanstack/react-query';
import type { SavedChoices } from '#lib/product/session-configuration';
import {
  chosenOptions,
  type ConfigurationPicks,
} from './session-option-choices';

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

// Written from Session snapshots; fetched only for a New worktree's never-opened Agent (`useSessionOptions`).
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
  // A New worktree opens no Session before Send, so the Server reads an uncached Agent's options (ADR-0023).
  inNewWorktree: boolean;
}

export interface SessionOptions {
  configOptions: SessionConfigOption[];
  // Only while this Device has no options for the Agent and Project and a Session or the Server reads them; then the cache shows at once.
  loading: boolean;
}

// The cached options with the reader's choices over them; nothing cached yet shows the Agent's defaults.
export const sessionOptions = (
  cached: SessionConfigOption[] | undefined,
  {
    saved,
    picks,
    opening,
  }: Omit<SessionOptionsChoice, 'agent' | 'projectId' | 'inNewWorktree'>,
): SessionOptions => ({
  configOptions: cached ? chosenOptions(cached, saved, picks) : [],
  loading: cached === undefined && opening,
});
