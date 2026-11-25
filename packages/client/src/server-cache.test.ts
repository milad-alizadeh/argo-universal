import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from '@repo/engine/router';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TRPC } from '#features/connection';
import { page, streamed } from '../mocks/feed-state.mocks';
import { memoryStorage } from '../mocks/memory-storage';
import { applyFeedEvents } from './features/feed/api/apply-feed-events';
import {
  feedKey,
  feedPageSize,
  snapshotKey,
} from './features/feed/api/feed-query';
import {
  emptyFeed,
  type FeedState,
  mergeNewestPage,
} from './features/feed/view/feed-state';
import { treeKey } from './features/plugins/utils/page-keys';
import {
  forgetServerCache,
  rememberServerCache,
} from './features/servers/server-cache-store';
import {
  createServerQueryClient,
  trimDevice,
  writeToDevice,
} from './server-cache';

const { rows, snapshot } = streamed;

const sessions = [{ id: 'session-1' }];

const hourMs = 3_600_000;

const feedsKept = 20;

const writeWindowMs = 2500;

const serverAsked = 'the Server was asked';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubGlobal('window', { localStorage: memoryStorage() });
});

afterEach(() => {
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface StartedApp {
  queryClient: QueryClient;
  trpc: TRPC;
  // The App closes: what was still waiting to be written is written.
  quit: () => Promise<void>;
  // The App goes to the background: what was still waiting is written now, and the cache keeps writing.
  background: () => void;
  // Reads a query as a screen does, giving the Server's answer only if the Device holds none.
  read: <T>(key: readonly unknown[]) => Promise<T>;
  serverReads: () => number;
}

// The App as it starts: a client with its defaults, the kept lists named, and the cache of one Server.
function startApp(serverId: string): StartedApp {
  const queryClient = createServerQueryClient(serverId);

  const trpc = createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient<AppRouter>({ links: [] }),
    queryClient,
  });

  void trimDevice({ serverId });
  const device = writeToDevice(queryClient, trpc, { serverId });
  let reads = 0;

  return {
    queryClient,
    trpc,
    quit: async () => {
      device.stop();
      await vi.advanceTimersByTimeAsync(writeWindowMs);
    },
    background: device.flush,
    read: <T>(key: readonly unknown[]): Promise<T> =>
      queryClient.fetchQuery<T>({
        queryKey: key,
        queryFn: () => {
          reads += 1;

          return Promise.reject(new Error(serverAsked));
        },
        retry: false,
      }),
    serverReads: () => reads,
  };
}

const sessionListKey = (app: StartedApp): readonly unknown[] =>
  app.trpc.session.list.queryOptions({ archived: false }).queryKey;

const heldFeed = mergeNewestPage(emptyFeed, page(rows, 9));

const tree = { pluginId: 'tracker', path: '/', pageState: {} };

const keysOf = async (serverId: string): Promise<string[]> =>
  (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(`query-cache:${serverId}:`),
  );

// A window of `size` rows, as paging back through a long Session leaves it.
function longFeed(size: number): FeedState {
  const held = heldFeed.rows;

  const rowsHeld = Array.from(
    { length: Math.ceil(size / held.length) },
    (_, copy) =>
      held.map((row, index) => ({
        ...row,
        id: `${row.id}-${copy}`,
        position: copy * held.length + index,
      })),
  )
    .flat()
    .slice(0, size);

  return { ...heldFeed, rows: rowsHeld, hasOlder: false, startCursor: 0 };
}

const revised = (by: number): FeedState => ({
  ...heldFeed,
  revision: heldFeed.revision + by,
});

it('draws the Session list, a Feed and a Plugin page tree after a restart, with no read of the Server', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(sessionListKey(first), sessions);
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  first.queryClient.setQueryData(snapshotKey('session-1'), snapshot);
  first.queryClient.setQueryData(treeKey(tree), { type: 'tree' });
  await first.quit();

  const second = startApp('studio');

  expect(await second.read(sessionListKey(second))).toEqual(sessions);
  expect(await second.read(feedKey('session-1'))).toEqual(heldFeed);
  expect(await second.read(snapshotKey('session-1'))).toEqual(snapshot);
  expect(await second.read(treeKey(tree))).toEqual({ type: 'tree' });
  expect(second.serverReads()).toBe(0);
});

it('keeps nothing else, such as a Project branch list', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(
    first.trpc.project.listBranches.queryOptions({ projectId: 'p' }).queryKey,
    { branches: ['main'], currentBranch: 'main' },
  );
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.quit();

  expect(await keysOf('studio')).toHaveLength(1);
});

it('keeps each Server its own cache', async () => {
  const studio = startApp('studio');
  studio.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await studio.quit();

  const laptop = startApp('laptop');

  await expect(laptop.read(feedKey('session-1'))).rejects.toThrow(serverAsked);
});

it('does not mix a Server with one whose id starts with its own', async () => {
  const short = startApp('a');
  short.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await short.quit();
  const long = startApp('a-b');
  long.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await long.quit();

  await forgetServerCache('a');

  expect(await keysOf('a')).toEqual([]);
  expect(await keysOf('a-b')).toHaveLength(1);
});

it('draws from the Device with the Server unreachable', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(sessionListKey(first), sessions);
  await first.quit();

  onlineManager.setOnline(false);
  const second = startApp('studio');

  expect(await second.read(sessionListKey(second))).toEqual(sessions);
  expect(second.serverReads()).toBe(0);
});

it('holds a restored Feed at the revision it was kept at, which is where its subscription resumes', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.quit();

  const second = startApp('studio');
  const restored = await second.read<FeedState>(feedKey('session-1'));

  expect(heldFeed.revision).toBeGreaterThan(0);
  expect(restored.revision).toBe(heldFeed.revision);
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
  await first.quit();

  const second = startApp('studio');

  expect(await second.read<FeedState>(feedKey('session-1'))).toMatchObject({
    epoch: 1,
    rows: [],
  });
  expect(await second.read(feedKey('session-2'))).toEqual(heldFeed);
  expect(await second.read(sessionListKey(second))).toEqual(sessions);
});

it('writes only the query that changed', async () => {
  const app = startApp('studio');
  app.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  app.queryClient.setQueryData(feedKey('session-2'), heldFeed);
  await vi.advanceTimersByTimeAsync(writeWindowMs);
  const written = vi.spyOn(AsyncStorage, 'setItem');

  app.queryClient.setQueryData(feedKey('session-1'), revised(1));
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  expect(written).toHaveBeenCalledOnce();
  expect(written.mock.calls[0]?.[0]).toContain('session-1');
});

it('writes what is waiting when the App goes to the background, which may be the last it runs', async () => {
  const app = startApp('studio');
  const written = vi.spyOn(AsyncStorage, 'setItem');

  app.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  app.background();
  await vi.advanceTimersByTimeAsync(0);

  expect(written).toHaveBeenCalledOnce();
});

it('carries on when the Device refuses a write, rather than leaving a rejection nobody handles', async () => {
  const app = startApp('studio');

  const refused = vi
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValue(new Error('disk full'));

  app.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  expect(refused).toHaveBeenCalled();
});

it('writes a Feed streaming rows once per window, not once per row', async () => {
  const app = startApp('studio');
  app.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await vi.advanceTimersByTimeAsync(writeWindowMs);
  const written = vi.spyOn(AsyncStorage, 'setItem');

  for (let step = 1; step <= 20; step += 1)
    app.queryClient.setQueryData(feedKey('session-1'), revised(step));
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  expect(written.mock.calls.length).toBeLessThanOrEqual(2);
});

it('drops a copy older than a day', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.quit();

  await vi.advanceTimersByTimeAsync(25 * hourMs);
  const second = startApp('studio');
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  expect(await keysOf('studio')).toEqual([]);
  await expect(second.read(feedKey('session-1'))).rejects.toThrow(serverAsked);
});

it('does not make a copy younger by restoring it', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.quit();

  await vi.advanceTimersByTimeAsync(23 * hourMs);
  const second = startApp('studio');
  await second.read(feedKey('session-1'));
  // The persister sets the age the copy had a moment after it restores it.
  await vi.advanceTimersByTimeAsync(10);
  await second.quit();

  await vi.advanceTimersByTimeAsync(2 * hourMs);
  const third = startApp('studio');
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  await expect(third.read(feedKey('session-1'))).rejects.toThrow(serverAsked);
});

it('restores a long Feed window as its newest rows, with older history to page in', async () => {
  const long = longFeed(400);
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), long);
  await first.quit();

  const restored = await startApp('studio').read<FeedState>(
    feedKey('session-1'),
  );

  expect(restored.rows).toEqual(long.rows.slice(-feedPageSize));
  expect(restored).toMatchObject({
    epoch: long.epoch,
    revision: long.revision,
    hasOlder: true,
    startCursor: restored.rows[0]?.position,
  });
});

it('keeps only the most recently written Feeds of a Server', async () => {
  const app = startApp('studio');

  for (let session = 0; session < feedsKept + 5; session += 1) {
    app.queryClient.setQueryData(feedKey(`session-${session}`), heldFeed);
    await vi.advanceTimersByTimeAsync(writeWindowMs);
  }

  await app.quit();
  const restarted = startApp('studio');
  await vi.advanceTimersByTimeAsync(writeWindowMs);

  await expect(restarted.read(feedKey('session-0'))).rejects.toThrow(
    serverAsked,
  );
  expect(await restarted.read(feedKey('session-5'))).toEqual(heldFeed);
  expect(await restarted.read(feedKey(`session-${feedsKept + 4}`))).toEqual(
    heldFeed,
  );
});

it('reads storage that fails as nothing kept', async () => {
  const first = startApp('studio');
  first.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await first.quit();

  vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('unreadable'));
  const second = startApp('studio');

  await expect(second.read(feedKey('session-1'))).rejects.toThrow(serverAsked);
});

it('wipes one Server when the Device is unpaired from it, though a write was queued, and no other', async () => {
  const studio = startApp('studio');
  studio.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await vi.advanceTimersByTimeAsync(writeWindowMs);
  // The next changes wait in the throttle for their window.
  studio.queryClient.setQueryData(feedKey('session-1'), revised(1));
  studio.queryClient.setQueryData(feedKey('session-1'), revised(2));
  const laptop = startApp('laptop');
  laptop.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await vi.advanceTimersByTimeAsync(0);

  await forgetServerCache('studio');
  await studio.quit();

  expect(await keysOf('studio')).toEqual([]);
  expect(await keysOf('laptop')).toHaveLength(1);
});

it('writes again once the Server is paired again', async () => {
  await forgetServerCache('studio');
  rememberServerCache('studio');

  const app = startApp('studio');
  app.queryClient.setQueryData(feedKey('session-1'), heldFeed);
  await app.quit();

  expect(await keysOf('studio')).toHaveLength(1);
});
