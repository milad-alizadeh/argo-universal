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
 * The Plugins this Device turned off on Session rows, by Plugin id. A Plugin is on until it is listed, so a Plugin
 * installed later shows its items without a visit to Settings.
 */
export type HiddenSessionRowPlugins = readonly string[];

const noneHidden: HiddenSessionRowPlugins = [];

const storageKey = 'session-row-plugins-hidden';

// Anything kept that is not a list of ids shows every Plugin.
const Kept = z.array(z.string()).catch([]);

function keptHidden(saved: string | null): HiddenSessionRowPlugins {
  if (saved === null) return noneHidden;

  try {
    return Kept.parse(JSON.parse(saved));
  } catch {
    return noneHidden;
  }
}

// Writes run one after another, so the last choice is the one kept, and a read waits for them.
let writes = Promise.resolve();

async function load(): Promise<HiddenSessionRowPlugins> {
  await writes;

  return keptHidden(await AsyncStorage.getItem(storageKey));
}

function loadFailed(cause: unknown): HiddenSessionRowPlugins {
  console.error('Could not load the Plugins hidden on Session rows', cause);

  return noneHidden;
}

type HiddenKey = readonly ['session-row-plugins-hidden'];

type HiddenQuery = UnusedSkipTokenOptions<
  HiddenSessionRowPlugins,
  Error,
  HiddenSessionRowPlugins,
  HiddenKey
> & { queryKey: DataTag<HiddenKey, HiddenSessionRowPlugins, Error> };

// The Plugins this Device hid; a failed read hides none.
export function hiddenSessionRowPluginsQuery(): HiddenQuery {
  return queryOptions({
    queryKey: ['session-row-plugins-hidden'] as const,
    queryFn: () => load().catch(loadFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

const withShown = (
  hidden: HiddenSessionRowPlugins,
  pluginId: string,
  shown: boolean,
): HiddenSessionRowPlugins => {
  const others = hidden.filter((id) => id !== pluginId);

  return shown ? others : [...others, pluginId];
};

// Shows the choice at once, wins over a read still loading, and keeps it for the next App start.
export function chooseSessionRowPluginShown(
  client: QueryClient,
  pluginId: string,
  shown: boolean,
): void {
  const { queryKey } = hiddenSessionRowPluginsQuery();
  const current = client.getQueryData(queryKey) ?? noneHidden;
  const next = withShown(current, pluginId, shown);

  void client.cancelQueries({ queryKey, exact: true });
  client.setQueryData(queryKey, next);
  keep(next);
}

function keep(hidden: HiddenSessionRowPlugins): void {
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(hidden)))
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Plugins hidden on Session rows', cause);
}

export const isShownOnSessionRows = (
  hidden: HiddenSessionRowPlugins,
  pluginId: string,
): boolean => !hidden.includes(pluginId);

/*
 * The Plugins this Device turned off on Session rows: none until the kept list loads. The Session row's items read
 * this to leave out a hidden Plugin's items.
 */
export function useHiddenSessionRowPlugins(): HiddenSessionRowPlugins {
  const { data = noneHidden } = useQuery(hiddenSessionRowPluginsQuery());

  return data;
}

// Turns one Plugin's items on or off for Session rows on this Device.
export function useSessionRowPluginShown(): (
  pluginId: string,
  shown: boolean,
) => void {
  const client = useQueryClient();

  return (pluginId, shown) =>
    chooseSessionRowPluginShown(client, pluginId, shown);
}
