import type { QueryClient, QueryFilters } from '@tanstack/react-query';

/*
 * A live update refreshes the list by replacing any fetch already in flight, never by joining one.
 * Such a fetch asked the Server before the update happened, so it answers without it, and because
 * React Query takes its success for the refresh, nothing is left to correct the list: a row stays
 * missing, or keeps a title it was renamed out of, for as long as the page stays open. Cancelling
 * first leaves the rows the list already shows in place and asks again from here.
 * `createCoalescedRefetch` is what keeps a burst of updates from asking once per update.
 */
export async function refreshSessionList(
  client: QueryClient,
  list: QueryFilters,
): Promise<void> {
  await client.cancelQueries(list, { revert: true, silent: true });
  await client.invalidateQueries(list);
}
