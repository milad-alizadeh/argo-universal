import type { QueryClient, QueryFilters } from '@tanstack/react-query';

// A read still fresh, or already in flight, saw everything a list subscription that starts now would announce; only a stale one asks again.
export async function catchUpSessionList(
  client: QueryClient,
  list: QueryFilters,
): Promise<void> {
  await client.refetchQueries(
    { ...list, stale: true },
    { cancelRefetch: false },
  );
}
