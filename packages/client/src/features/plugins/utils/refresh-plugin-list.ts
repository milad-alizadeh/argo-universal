import type { QueryClient, QueryFilters } from '@tanstack/react-query';

// The query families that make up Plugin state, as the tRPC options proxy names them.
interface Trpc {
  plugin: {
    list: { queryFilter: () => QueryFilters };
    getSettings: { queryFilter: () => QueryFilters };
  };
  plugins: { declared: { queryFilter: () => QueryFilters } };
}

/*
 * A live change refreshes the Plugin lists by replacing any fetch already in flight, never by joining
 * one. Such a fetch asked the Server before the change happened, so it answers without it, and because
 * React Query takes its success for the refresh, nothing is left to correct the list: a Plugin stays in
 * the rail after it was turned off, or stays missing after it was turned on, for as long as the page
 * stays open. Cancelling first leaves the lists already on screen in place and asks again from here;
 * `cancelRefetch` alone is not enough, as React Query only replaces the fetch of a list that already
 * has data, and a page opened a moment ago has none.
 */
export async function refreshPluginList(
  client: QueryClient,
  lists: QueryFilters[],
): Promise<void> {
  await Promise.all(
    lists.map(async (list): Promise<void> => {
      await client.cancelQueries(list, { revert: true, silent: true });
      await client.invalidateQueries(list);
    }),
  );
}

// The live change: the Plugin list and the declared Slot items follow which Plugins the Server runs.
export function refreshLivePluginState(
  client: QueryClient,
  trpc: Trpc,
): Promise<void> {
  return refreshPluginList(client, [
    trpc.plugin.list.queryFilter(),
    trpc.plugins.declared.queryFilter(),
  ]);
}

// A Settings change: also each Plugin's settings, which only Settings changes. It joins fetches in flight, as it always has.
export async function invalidatePluginState(
  client: QueryClient,
  trpc: Trpc,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries(trpc.plugin.list.queryFilter()),
    client.invalidateQueries(trpc.plugin.getSettings.queryFilter()),
    client.invalidateQueries(trpc.plugins.declared.queryFilter()),
  ]);
}
