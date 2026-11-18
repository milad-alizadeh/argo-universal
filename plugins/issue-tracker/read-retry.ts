// The first wait after a failed first read, doubled after each retry up to the last.
const firstRetryMs = 15_000;

const lastRetryMs = 300_000;

// A first read, answering `null` once it has failed and scheduled a retry.
export type ReadRetry = <Value>(read: Promise<Value>) => Promise<Value | null>;

type State = { delayMs: number; waiting: boolean; changed: () => void };

/*
 * A failed read is kept as the Query's answer until a write makes it due, so a retry says `changed`: every Query is
 * due and the Slots ask again, and their first reads go to the Tracker. One retry waits at a time for every Issue, so
 * an outage costs one `changed` per wait; a read that lands resets the wait, and the retries stop once none fails.
 */
export function readRetry(changed: () => void): ReadRetry {
  const state: State = { delayMs: firstRetryMs, waiting: false, changed };

  return (read) =>
    read.then(
      (value) => {
        // A read that lands while a retry waits leaves the wait as it is, as another read failed.
        if (!state.waiting) state.delayMs = firstRetryMs;

        return value;
      },
      () => {
        retryLater(state);

        return null;
      },
    );
}

function retryLater(state: State): void {
  if (state.waiting) return;

  state.waiting = true;
  setTimeout(() => {
    state.waiting = false;
    state.changed();
  }, state.delayMs);
  state.delayMs = Math.min(state.delayMs * 2, lastRetryMs);
}
