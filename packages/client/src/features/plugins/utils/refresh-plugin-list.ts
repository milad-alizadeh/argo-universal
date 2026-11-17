import type { QueryClient, QueryFilters } from '@tanstack/react-query';

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
