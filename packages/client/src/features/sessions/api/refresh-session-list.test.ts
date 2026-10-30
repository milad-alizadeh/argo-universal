import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshSessionList } from './refresh-session-list';

const liveTitle = 'Check the live list';

const listKey = ['session', 'list'] as const;

const listFilter = { queryKey: listKey };

// Enough turns for a cancelled fetch, the fetch that replaces it and its answer.
const settleRounds = 20;

interface HeldSessionList {
  titles: string[];
  client: QueryClient;
  // Answers the fetches waiting now and the ones their answers start.
  settle: () => Promise<void>;
  watch: () => void;
  // Asks again for a reason of the list's own, as mounting a second view of it does.
  askAgain: () => void;
}

/*
 * A Server whose answers are held: a fetch answers the titles the list held when it was asked, so a
 * fetch that started before a change and finished after it answers without the change, as a slow
 * one does. A dropped ask ends at once, as a request whose Connection is closed does.
 */
function heldSessionList(): HeldSessionList {
  const waiting: (() => void)[] = [];

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const queryFn = ({ signal }: { signal: AbortSignal }): Promise<string[]> => {
    const asked = [...held.titles];

    return new Promise<string[]>((resolve, reject): void => {
      signal.addEventListener('abort', (): void => reject(signal.reason));
      waiting.push((): void => resolve(asked));
    });
  };

  const held: HeldSessionList = {
    titles: [],
    client,
    settle: async (): Promise<void> => {
      for (let round = 0; round < settleRounds; round += 1) {
        for (const answer of waiting.splice(0)) answer();
        await new Promise<void>((resolve): void => {
          setTimeout(resolve, 0);
        });
      }
    },
    watch: (): void => {
      new QueryObserver(client, { queryKey: listKey, queryFn }).subscribe(
        (): void => {},
      );
    },
    askAgain: (): void => void client.refetchQueries(listFilter),
  };

  return held;
}

const listedTitles = (client: QueryClient): string[] | undefined =>
  client.getQueryData<string[]>(listKey);

describe('refreshing the Sessions list for a live update', () => {
  it('lists a Session the update announced while a fetch was in flight', async () => {
    const held = heldSessionList();
    held.watch();
    await held.settle();
    expect(listedTitles(held.client)).toStrictEqual([]);
    held.askAgain();
    held.titles = [liveTitle];

    const refreshed = refreshSessionList(held.client, listFilter);
    await held.settle();
    await refreshed;

    expect(listedTitles(held.client)).toStrictEqual([liveTitle]);
  });

  it('lists a Session the update announced while the first fetch was in flight', async () => {
    const held = heldSessionList();
    // A page opened a moment ago has asked for its first list and has nothing to show yet.
    held.watch();
    held.titles = [liveTitle];

    const refreshed = refreshSessionList(held.client, listFilter);
    await held.settle();
    await refreshed;

    expect(listedTitles(held.client)).toStrictEqual([liveTitle]);
  });
});
