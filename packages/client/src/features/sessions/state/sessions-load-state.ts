export type SessionsLoadState = 'loading' | 'error' | 'ready';

export interface QueryProgress {
  // The first load failed.
  failed: boolean;
  // Still waiting for the first result.
  pending: boolean;
}

// The list waits for every query it draws from, and a failure shows only once nothing is still pending.
export function sessionsLoadState(
  queries: readonly QueryProgress[],
): SessionsLoadState {
  if (queries.some((query) => query.pending)) return 'loading';
  if (queries.some((query) => query.failed)) return 'error';
  return 'ready';
}
