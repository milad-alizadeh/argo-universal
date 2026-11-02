import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { holdCacheOnline } from './cache-online.ts';
import { type FakeLink, fakeLink } from './connection.mocks.ts';

let link: FakeLink;

const closers: (() => void)[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  link = fakeLink();
  // The Server being looked at drives the cache's online flag; nothing refetches without that hold.
  closers.push(holdCacheOnline(link.connection));
});

afterEach(() => {
  for (const close of closers.splice(0)) close();
  link.connection.stop();
  vi.useRealTimers();
});

const loseOpenConnection = (): void => {
  link.open();
  link.lose();
};

interface ObservedQuery {
  fetches: () => number;
}

// An observed query on a mounted client, as a mounted screen has.
function observeQuery(): ObservedQuery {
  const queryClient = new QueryClient();
  queryClient.mount();
  let fetches = 0;

  const observer = new QueryObserver(queryClient, {
    queryKey: ['system.info'],
    queryFn: (): number => {
      fetches += 1;

      return fetches;
    },
  });

  const unsubscribe = observer.subscribe(() => {});

  closers.push(unsubscribe, () => queryClient.unmount());

  return { fetches: () => fetches };
}

describe('Refetch after reconnect', () => {
  it('fetches observed queries again once the Connection reopens', async () => {
    const query = observeQuery();
    await vi.advanceTimersByTimeAsync(0);
    expect(query.fetches()).toBe(1);

    loseOpenConnection();
    await vi.advanceTimersByTimeAsync(0);
    expect(query.fetches()).toBe(1);
    link.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(query.fetches()).toBe(2);
  });

  it('does not refetch when the first Connection opens', async () => {
    const query = observeQuery();
    await vi.advanceTimersByTimeAsync(0);

    link.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(query.fetches()).toBe(1);
  });
});
