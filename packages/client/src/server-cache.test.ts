import type { AppRouter } from '@repo/engine/router';
import {
  onlineManager,
  type QueryClient,
  QueryObserver,
} from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client';
import { createTRPCClient } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TRPC } from '#features/connection';
import { page, streamed } from '../mocks/feed-state.mocks';
import { memoryStorage } from '../mocks/memory-storage';
import { applyFeedEvents } from './features/feed/api/apply-feed-events';
import { feedKey, snapshotKey } from './features/feed/api/feed-query';
import {
  emptyFeed,
  type FeedState,
  mergeNewestPage,
} from './features/feed/view/feed-state';
import { treeKey } from './features/plugins/utils/page-keys';
import { createQueryClient, keepServerLists } from './query-cache';
import { forgetServerCache, serverCache } from './server-cache';

const { rows, snapshot } = streamed;

const sessions = [{ id: 'session-1' }];

// A Device's storage, empty at the start of each test.
beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
});

afterEach(() => {
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
});

interface StartedApp {
  queryClient: QueryClient;
  trpc: TRPC;
  save: () => Promise<void>;
  restore: () => Promise<void>;
}

type App = StartedApp;

// The App as it starts: a client with its defaults, the kept lists named, and the cache of one Server.
function startApp(serverId: string): StartedApp {
  const queryClient = createQueryClient();

  const trpc = createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient<AppRouter>({ links: [] }),
    queryClient,
  });

  keepServerLists(queryClient, trpc);

  const options = { queryClient, ...serverCache(serverId, trpc) };

  return {
    queryClient,
    trpc,
    save: () => persistQueryClientSave(options),
    restore: async () => {
      await persistQueryClientRestore(options);
    },
  };
}

const sessionListKey = (app: App): readonly unknown[] =>
  app.trpc.session.list.queryOptions({ archived: false }).queryKey;

const heldFeed = mergeNewestPage(emptyFeed, page(rows, 9));

const tree = { pluginId: 'tracker', path: '/', pageState: {} };

it('draws the Session list, a Feed and a Plugin page tree after a restart', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(sessionListKey(first), sessions);
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  first.queryClient.setQueryData(snapshotKey('session-1'), snapshot);
  first.queryClient.setQueryData(treeKey(tree), { type: 'tree' });
  await first.save();

  const second = startApp('studio');
  await second.restore();

  const read = <T>(key: readonly unknown[]): T | undefined =>
    second.queryClient.getQueryData<T>(key);

  expect(read(sessionListKey(second))).toEqual(sessions);
  expect(read(feedKey('session-1'))).toEqual(heldFeed);
  expect(read(snapshotKey('session-1'))).toEqual(snapshot);
  expect(read(treeKey(tree))).toEqual({ type: 'tree' });
});

it('keeps nothing else, such as a Project branch list or a read that failed', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(
    first.trpc.project.listBranches.queryOptions({ projectId: 'p' }).queryKey,
    { branches: ['main'], currentBranch: 'main' },
  );
  await first.queryClient
    .fetchQuery({
      queryKey: feedKey('broken'),
      queryFn: () => Promise.reject(new Error('down')),
      retry: false,
    })
    .catch(() => {});
  await first.save();

  const second = startApp('studio');
  await second.restore();

  expect(second.queryClient.getQueryCache().getAll()).toEqual([]);
});

it('keeps each Server its own cache', async () => {
  const studio = startApp('studio');
  studio.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await studio.save();

  const laptop = startApp('laptop');
  await laptop.restore();

  expect(laptop.queryClient.getQueryData(feedKey('session-1'))).toBeUndefined();
});

it('draws from the Device with the Server unreachable, the read held rather than failed', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(sessionListKey(first), sessions);
  await first.save();

  onlineManager.setOnline(false);
  const second = startApp('studio');
  await second.restore();

  const queryFn = vi.fn<() => Promise<never>>(() =>
    Promise.reject(new Error('unreachable')),
  );

  // Stale, so the screen asks again as it opens; with no Connection that ask waits.
  const observer = new QueryObserver(second.queryClient, {
    ...second.trpc.session.list.queryOptions({ archived: false }),
    queryFn,
    staleTime: 0,
  });

  const stop = observer.subscribe(() => {});
  const list = observer.getCurrentResult();

  stop();

  expect(list).toMatchObject({
    data: sessions,
    status: 'success',
    fetchStatus: 'paused',
  });
  expect(queryFn).not.toHaveBeenCalled();
});

it('holds a restored Feed at the revision it was kept at, which is where its subscription resumes', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.save();

  const second = startApp('studio');
  await second.restore();

  expect(heldFeed.revision).toBeGreaterThan(0);
  expect(
    second.queryClient.getQueryData<FeedState>(feedKey('session-1'))?.revision,
  ).toBe(heldFeed.revision);
});

it('drops the stored Feed of a Session the Server rebuilt, keeping the rest', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  first.queryClient.setQueryData(feedKey('session-2'), heldFeed);
  first.queryClient.setQueryData(sessionListKey(first), sessions);

  applyFeedEvents(
    {
      queryClient: first.queryClient,
      cacheId: 'session-1',
      fetchRow: () => new Promise(() => {}),
    },
    [{ type: 'reset', epoch: 1 }],
  );
  await first.save();

  const second = startApp('studio');
  await second.restore();

  expect(
    second.queryClient.getQueryData<FeedState>(feedKey('session-1')),
  ).toMatchObject({ epoch: 1, rows: [] });
  expect(second.queryClient.getQueryData(feedKey('session-2'))).toEqual(
    heldFeed,
  );
  expect(second.queryClient.getQueryData(sessionListKey(second))).toEqual(
    sessions,
  );
});

it('wipes one Server when the Device is unpaired from it, and no other', async () => {
  const studio = startApp('studio');
  studio.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await studio.save();
  const laptop = startApp('laptop');
  laptop.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await laptop.save();

  await forgetServerCache('studio');

  const studioAgain = startApp('studio');
  await studioAgain.restore();
  const laptopAgain = startApp('laptop');
  await laptopAgain.restore();

  expect(
    studioAgain.queryClient.getQueryData(feedKey('session-1')),
  ).toBeUndefined();
  expect(laptopAgain.queryClient.getQueryData(feedKey('session-1'))).toEqual(
    heldFeed,
  );
});
