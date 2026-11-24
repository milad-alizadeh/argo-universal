import { FeedSubscribeInput } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { activeSessions } from '@repo/mocks/app';
import type { AsyncStorage as PersisterStorage } from '@tanstack/query-persist-client-core';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createTRPCClient, type TRPCClient } from '@trpc/client';
import { observable, type Observer } from '@trpc/server/observable';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { JSX } from 'react';
import {
  type Connection,
  ConnectionContext,
  type ConnectionState,
  TRPCProvider,
  useConnectionState,
  useTRPC,
} from '#features/connection';
import { useSessionListUpdates } from '#features/sessions';
import { ConnectionBanner } from '../src/features/connection/components/connection-banner/connection-banner';
import { feedKey, snapshotKey } from '../src/features/feed/api/feed-query';
import { useSessionFeed } from '../src/features/feed/hooks/use-session-feed';
import {
  emptyFeed,
  mergeNewestPage,
} from '../src/features/feed/view/feed-state';
import { serverQueryPersister } from '../src/features/servers/server-cache-store';
import { createQueryClient, keepServerLists } from '../src/query-cache';
import { restoreFromDevice } from '../src/server-cache';
import { page, streamed } from './feed-state.mocks';

const sessionId = 'session-1';

const serverId = 'story-server';

const noop = (): void => {};

// What an App that has run before left on the Device: a Feed seen at revision 0, its snapshot and the Session list.
function seededDevice(storage: PersisterStorage): Promise<void[]> {
  const seeding = createQueryClient();

  const trpc = createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient<AppRouter>({ links: [] }),
    queryClient: seeding,
  });

  const persister = serverQueryPersister(serverId, storage);
  const listKey = trpc.session.list.queryOptions({ archived: false }).queryKey;

  seeding.setQueryData(listKey, activeSessions);
  seeding.setQueryData(
    feedKey(sessionId),
    mergeNewestPage(emptyFeed, page([], 0)),
  );
  seeding.setQueryData(snapshotKey(sessionId), streamed.snapshot);

  return Promise.all(
    [listKey, feedKey(sessionId), snapshotKey(sessionId)].map((queryKey) =>
      persister.persistQueryByKey(queryKey, seeding),
    ),
  );
}

interface Device {
  storage: PersisterStorage;
  release: () => void;
}

// The Device's storage in memory, seeded; `getItem` waits for `release`, as a slow disk does.
function device(slow: boolean): Device {
  const values = new Map<string, string>();
  const gate = Promise.withResolvers<void>();
  const seeded = Promise.withResolvers<void>();

  const storage: PersisterStorage = {
    getItem: async (key) => {
      await Promise.all([seeded.promise, gate.promise]);

      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
    entries: () => [...values.entries()],
  };

  void seededDevice(storage).then(() => seeded.resolve());

  if (!slow) gate.resolve();

  return { storage, release: () => gate.resolve() };
}

type Wire = Observer<{ result: { type: 'started' } }, never>;

export interface ServerCacheFixture {
  queryClient: ReturnType<typeof createQueryClient>;
  client: TRPCClient<AppRouter>;
  connection: Connection;
  // The `lastEventId` of each `feed.subscribe` the App opened.
  opened: string[];
  // How many `session.listUpdates` subscriptions the App opened.
  listUpdates: () => number;
  // The Device answers what it kept.
  release: () => void;
}

interface Asked {
  opened: string[];
  listUpdates: number;
}

// The Server answers nothing but a subscription's start, as one that cannot be reached does; it notes what it was asked.
function unreachableClient(asked: Asked): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      () =>
        ({ op }) =>
          observable((wire: Wire): (() => void) => {
            if (op.path === 'feed.subscribe') {
              asked.opened.push(
                FeedSubscribeInput.parse(op.input).lastEventId ?? '',
              );
              wire.next({ result: { type: 'started' } });
            } else if (op.path === 'session.listUpdates') {
              asked.listUpdates += 1;
              wire.next({ result: { type: 'started' } });
            }

            return noop;
          }),
    ],
  });
}

const connectionIn = (state: ConnectionState): Connection => ({
  state: () => state,
  subscribe: () => noop,
  nextAttempt: () => Promise.resolve(),
  watch: noop,
  foreground: noop,
  retry: noop,
  refuse: noop,
  stop: noop,
});

// An App that has run before: its Device holds a Feed at revision 0 and the Session list.
export function serverCacheFixture(
  state: ConnectionState,
  { slow }: { slow: boolean },
): ServerCacheFixture {
  const queryClient = createQueryClient();
  const kept = device(slow);
  const asked: Asked = { opened: [], listUpdates: 0 };
  const client = unreachableClient(asked);
  const trpc = createTRPCOptionsProxy<AppRouter>({ client, queryClient });

  keepServerLists(queryClient, trpc);
  restoreFromDevice(queryClient, trpc, { serverId, storage: kept.storage });

  return {
    queryClient,
    client,
    connection: connectionIn(state),
    opened: asked.opened,
    listUpdates: () => asked.listUpdates,
    release: kept.release,
  };
}

// The Session list's titles and the Feed's revision, as the screens draw them, beside the Connection's own banner.
function Screens(): JSX.Element {
  const trpc = useTRPC();
  const connection = useConnectionState();
  const feed = useSessionFeed(sessionId);
  useSessionListUpdates();

  const { data } = useQuery(
    trpc.session.list.queryOptions({ archived: false }),
  );

  return (
    <>
      <ConnectionBanner state={connection} onRetry={noop} />
      <ul>
        {data?.sessions.map((session) => (
          <li key={session.sessionId}>{session.title}</li>
        ))}
      </ul>
      <span>
        {feed.ready ? `Feed at revision ${feed.revision}` : 'No Feed'}
      </span>
    </>
  );
}

export function ServerCachePreview({
  fixture,
}: {
  fixture: ServerCacheFixture;
}): JSX.Element {
  return (
    <ConnectionContext.Provider value={fixture.connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          <Screens />
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
