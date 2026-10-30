import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { refreshSessionList } from './refresh-session-list';

const liveTitle = 'Check the live list';

const listKey = ['session', 'list'] as const;

const listFilter = { queryKey: listKey };

interface ListOnTheServer {
  // What `session.list` answers, read when a fetch starts rather than when it finishes.
  titles: string[];
  // Finishes the fetches waiting now and the ones their answers start, until the list is settled.
  settle: () => Promise<void>;
  client: QueryClient;
  // Mounts the list, which starts its first fetch, as a mounted list does.
  watch: () => void;
}

/*
 * A Server whose answers are held: a fetch answers what the list held when it was asked, so a fetch
 * started before a change and finished after it answers without the change, as a slow one does.
 */
function listOnTheServer(): ListOnTheServer {
  const server: ListOnTheServer = {
    titles: [],
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    settle: async (): Promise<void> => {
      for (let round = 0; round < 20; round += 1) {
        for (const answer of waiting.splice(0)) answer();
        await new Promise<void>((resolve): void => {
          setTimeout(resolve, 0);
        });
      }
    },
    watch: (): void => {
      new QueryObserver(server.client, {
        queryKey: listKey,
        queryFn,
      }).subscribe((): void => {});
    },
  };

  const waiting: (() => void)[] = [];

  // A dropped ask ends at once, as a request whose Connection is closed does.
  const queryFn = ({ signal }: { signal: AbortSignal }): Promise<string[]> => {
    const asked = [...server.titles];

    return new Promise<string[]>((resolve, reject): void => {
      signal.addEventListener('abort', (): void => reject(signal.reason));
      waiting.push((): void => resolve(asked));
    });
  };

  return server;
}

const listedTitles = (client: QueryClient): string[] | undefined =>
  client.getQueryData<string[]>(listKey);

describe('refreshing the Sessions list for a live update', () => {
  it('lists a Session the update announced while a fetch was in flight', async () => {
    const server = listOnTheServer();
    server.watch();
    await server.settle();
    expect(listedTitles(server.client)).toStrictEqual([]);

    // The list asks again — for a reason of its own — and the Session is started while that ask is in flight.
    void server.client.refetchQueries(listFilter);
    server.titles = [liveTitle];

    const refreshed = refreshSessionList(server.client, listFilter);
    await server.settle();
    await refreshed;

    expect(listedTitles(server.client)).toStrictEqual([liveTitle]);
  });

  it('lists a Session the update announced while the first fetch was in flight', async () => {
    const server = listOnTheServer();
    // A page opened just now has asked for its first list and has nothing to show yet.
    server.watch();
    server.titles = [liveTitle];

    const refreshed = refreshSessionList(server.client, listFilter);
    await server.settle();
    await refreshed;

    expect(listedTitles(server.client)).toStrictEqual([liveTitle]);
  });
});
