import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  type UnusedSkipTokenOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

/*
 * What this Device chose for Session rows: the Plugins it turned off, by Plugin id, and the Plugin that writes the
 * Activity line, or null while it is Argo's. A Plugin is on until it is listed, so a Plugin installed later shows its
 * items without a visit to Settings.
 */
export interface SessionRowChoices {
  hidden: readonly string[];
  activityOwner: string | null;
}

const argoChoices: SessionRowChoices = { hidden: [], activityOwner: null };

const storageKey = 'session-row-plugins';

// Anything kept that does not read as the choices falls back to Argo's own: every Plugin shown, Argo's line.
const Kept = z
  .object({
    hidden: z.array(z.string()).catch([]),
    activityOwner: z.string().nullable().catch(null),
  })
  .catch(() => ({ hidden: [], activityOwner: null }));

function keptChoices(saved: string | null): SessionRowChoices {
  if (saved === null) return argoChoices;

  try {
    return Kept.parse(JSON.parse(saved));
  } catch {
    return argoChoices;
  }
}

// Writes run one after another, so the last choice is the one kept, and a read waits for them.
let pendingWrites = Promise.resolve();

async function readKept(): Promise<SessionRowChoices> {
  await pendingWrites;

  return keptChoices(await AsyncStorage.getItem(storageKey));
}

function readFailed(cause: unknown): SessionRowChoices {
  console.error('Could not load the Session row choices', cause);

  return argoChoices;
}

type ChoicesKey = readonly ['session-row-plugins'];

type ChoicesQuery = UnusedSkipTokenOptions<
  SessionRowChoices,
  Error,
  SessionRowChoices,
  ChoicesKey
> & { queryKey: DataTag<ChoicesKey, SessionRowChoices, Error> };

// This Device's Session row choices; a failed read is Argo's own.
export function sessionRowChoicesQuery(): ChoicesQuery {
  return queryOptions({
    queryKey: ['session-row-plugins'] as const,
    queryFn: () => readKept().catch(readFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

type Change = (choices: SessionRowChoices) => SessionRowChoices;

// Builds on the kept choices once they have loaded, so an earlier choice is never lost, then shows and keeps the result.
async function choose(client: QueryClient, change: Change): Promise<void> {
  const options = sessionRowChoicesQuery();
  const loaded = await client.query(options);
  // A choice made while this one waited for the load is already in the cache.
  const next = change(client.getQueryData(options.queryKey) ?? loaded);

  client.setQueryData(options.queryKey, next);
  keep(next);
}

function keep(choices: SessionRowChoices): void {
  pendingWrites = pendingWrites
    .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(choices)))
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Session row choices', cause);
}

const withShown =
  (pluginId: string, shown: boolean): Change =>
  (choices) => {
    const others = choices.hidden.filter((id) => id !== pluginId);

    return { ...choices, hidden: shown ? others : [...others, pluginId] };
  };

// Turns one Plugin's items on or off for Session rows on this Device.
export const chooseSessionRowPluginShown = (
  client: QueryClient,
  pluginId: string,
  shown: boolean,
): Promise<void> => choose(client, withShown(pluginId, shown));

// Hands the Activity line to one Plugin, or back to Argo with null.
export const chooseActivityLineOwner = (
  client: QueryClient,
  owner: string | null,
): Promise<void> =>
  choose(client, (choices) => ({ ...choices, activityOwner: owner }));

export const isShownOnSessionRows = (
  choices: SessionRowChoices,
  pluginId: string,
): boolean => !choices.hidden.includes(pluginId);

/*
 * This Device's Session row choices: Argo's own until the kept ones load. The Session row's items read this to leave
 * out a hidden Plugin's items, and its Activity line to find its writer.
 */
export function useSessionRowChoices(): SessionRowChoices {
  const { data = argoChoices } = useQuery(sessionRowChoicesQuery());

  return data;
}

export interface SessionRowChoosers {
  onShownChange: (pluginId: string, shown: boolean) => void;
  onActivityOwnerChange: (owner: string | null) => void;
}

export function useSessionRowChoosers(): SessionRowChoosers {
  const client = useQueryClient();

  return {
    onShownChange: (pluginId, shown) =>
      void chooseSessionRowPluginShown(client, pluginId, shown),
    onActivityOwnerChange: (owner) =>
      void chooseActivityLineOwner(client, owner),
  };
}
