import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshPluginList } from './refresh-plugin-list';

const liveName = 'Check the live list';

const listKey = ['plugin', 'list'] as const;
const declaredKey = ['plugins', 'declared'] as const;

const listFilter = { queryKey: listKey };
const declaredFilter = { queryKey: declaredKey };

// Enough turns for a cancelled fetch, the fetch that replaces it and its answer.
const settleRounds = 20;

interface HeldPluginList {
  names: string[];
  client: QueryClient;
  // Answers the fetches waiting now and the ones their answers start.
  settle: () => Promise<void>;
  watch: () => void;
  // Asks again for a reason of the list's own, as mounting a second view of it does.
  askAgain: () => void;
}

/*
 * A Server whose answers are held: a fetch answers the names the list held when it was asked, so a
 * fetch that started before a change and finished after it answers without the change, as a slow
 * one does. A dropped ask ends at once, as a request whose Connection is closed does.
 */
function heldPluginList(): HeldPluginList {
  const waiting: (() => void)[] = [];

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const queryFn = ({ signal }: { signal: AbortSignal }): Promise<string[]> => {
    const asked = [...held.names];

    return new Promise<string[]>((resolve, reject): void => {
      signal.addEventListener('abort', (): void => reject(signal.reason));
      waiting.push((): void => resolve(asked));
    });
  };

  const held: HeldPluginList = {
    names: [],
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
      for (const queryKey of [listKey, declaredKey]) {
        new QueryObserver(client, { queryKey, queryFn }).subscribe(
          (): void => {},
        );
      }
    },
    askAgain: (): void => void client.refetchQueries(listFilter),
  };

  return held;
}

const namesOf = (
  client: QueryClient,
  key: readonly string[],
): string[] | undefined => client.getQueryData<string[]>(key);

describe('refreshing the Plugin list for a live change', () => {
  it('lists a Plugin the change announced while a fetch was in flight', async () => {
    const held = heldPluginList();
    held.watch();
    await held.settle();
    expect(namesOf(held.client, listKey)).toStrictEqual([]);
    held.askAgain();
    held.names = [liveName];

    const refreshed = refreshPluginList(held.client, [
      listFilter,
      declaredFilter,
    ]);
    await held.settle();
    await refreshed;

    expect(namesOf(held.client, listKey)).toStrictEqual([liveName]);
    expect(namesOf(held.client, declaredKey)).toStrictEqual([liveName]);
  });

  it('lists a Plugin the change announced while the first fetch was in flight', async () => {
    const held = heldPluginList();
    // A page opened a moment ago has asked for its first list and has nothing to show yet.
    held.watch();
    held.names = [liveName];

    const refreshed = refreshPluginList(held.client, [
      listFilter,
      declaredFilter,
    ]);
    await held.settle();
    await refreshed;

    expect(namesOf(held.client, listKey)).toStrictEqual([liveName]);
    expect(namesOf(held.client, declaredKey)).toStrictEqual([liveName]);
  });
});
