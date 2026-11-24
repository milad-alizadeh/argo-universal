import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { catchUpSessionList } from './catch-up-session-list';

const listKey = ['session', 'list'] as const;

const listFilter = { queryKey: listKey };

const readMs = 5;

const freshMs = 30_000;

// A list screen that mounted and read once: the observer is the screen, `reads` counts what reached the Server.
interface MountedList {
  client: QueryClient;
  reads: () => number;
}

function mountedList(staleTime: number): MountedList {
  let reads = 0;
  const client = new QueryClient();

  new QueryObserver(client, {
    queryKey: listKey,
    staleTime,
    queryFn: async (): Promise<string[]> => {
      reads += 1;
      await new Promise<void>((resolve): void => {
        setTimeout(resolve, readMs);
      });

      return [];
    },
  }).subscribe((): void => {});

  return { client, reads: (): number => reads };
}

const settle = (): Promise<void> =>
  new Promise<void>((resolve): void => {
    setTimeout(resolve, readMs * 4);
  });

describe('catching up when the Sessions list subscription starts', () => {
  it('joins the first read instead of asking again', async () => {
    const { client, reads } = mountedList(freshMs);

    await catchUpSessionList(client, listFilter);
    await settle();

    expect(reads()).toBe(1);
  });

  it('does not refetch a read that is still fresh', async () => {
    const { client, reads } = mountedList(freshMs);
    await settle();

    await catchUpSessionList(client, listFilter);
    await settle();

    expect(reads()).toBe(1);
  });

  it('refetches a read that has gone stale', async () => {
    const { client, reads } = mountedList(0);
    await settle();

    await catchUpSessionList(client, listFilter);
    await settle();

    expect(reads()).toBe(2);
  });
});
