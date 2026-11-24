import {
  type FeedSubscribeOutput,
  FeedSubscribeInput,
  type FeedSyncPoint,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCClient,
  TRPCClientError,
  type TRPCClient,
} from '@trpc/client';
import { type Observer, observable } from '@trpc/server/observable';
import { type JSX, useEffect } from 'react';
import {
  ConnectionContext,
  TRPCProvider,
  type Connection,
  type ConnectionState,
} from '#features/connection';
import { feedKey, snapshotKey } from '../../src/features/feed/api/feed-cache';
import {
  type FeedLive,
  useFeedLive,
} from '../../src/features/feed/hooks/use-feed-live';
import { useFeedWindow } from '../../src/features/feed/hooks/use-feed-window';
import {
  emptyFeed,
  type FeedState,
  mergeNewestPage,
} from '../../src/features/feed/view/feed-state';
import { toFeedView } from '../../src/features/feed/view/to-feed-view';
import { createQueryClient } from '../../src/query-cache';
import { page, streamed } from '../feed-state.mocks';

const sessionId = 'session-1';

const noop = (): void => {};

interface Link {
  state: ConnectionState;
  listeners: Set<() => void>;
}

function connectionOf(link: Link): Connection {
  return {
    state: () => link.state,
    subscribe: (listener) => {
      link.listeners.add(listener);

      return () => void link.listeners.delete(listener);
    },
    nextAttempt: () => Promise.resolve(),
    watch: noop,
    foreground: noop,
    retry: noop,
    refuse: noop,
    stop: noop,
  };
}

type Wire = Observer<
  { result: { type: 'data'; data: FeedSubscribeOutput } | { type: 'started' } },
  TRPCClientError<AppRouter>
>;

// A Server that answers `feed.subscribe` and records after which point each one opened.
interface Server {
  opened: (FeedSyncPoint | null)[];
  open: Wire | undefined;
  // What the Server sends when a subscription opens after a point; nothing when the Session has finished.
  serve: (after: FeedSyncPoint | null) => FeedSubscribeOutput[];
}

function clientOf(server: Server): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      () =>
        ({ op }) =>
          observable((wire: Wire) => {
            if (op.path !== 'feed.subscribe')
              throw new Error(`Unexpected request: ${op.path}`);

            const { after } = FeedSubscribeInput.parse(op.input);
            server.opened.push(after);
            server.open = wire;
            wire.next({ result: { type: 'started' } });

            for (const data of server.serve(after))
              wire.next({ result: { type: 'data', data } });
          }),
    ],
  });
}

export interface FeedLiveFixture {
  queryClient: ReturnType<typeof createQueryClient>;
  server: Server;
  // How many times the Session's Feed query was written.
  feedWrites: () => number;
  held: () => FeedState | undefined;
  // Sends the open subscription an event, as the Server does.
  send: (event: FeedSubscribeOutput) => void;
  // Ends the open subscription with an error, as a dropped socket does.
  fail: () => void;
  // Moves the Connection to another state.
  connect: (state: ConnectionState) => void;
  // The window regains focus, as the App returns to the foreground.
  returnToForeground: () => void;
  connection: Connection;
  client: TRPCClient<AppRouter>;
  // What the screen holds of the live changes, as of its last render.
  live: () => FeedLive | undefined;
  hold: (live: FeedLive) => void;
  // The Feed's first rows arrive, as the tail page does for a Session not seen before.
  loadTail: () => void;
}

function countWrites(
  queryClient: ReturnType<typeof createQueryClient>,
): () => number {
  let writes = 0;

  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryHash === JSON.stringify(feedKey(sessionId))
    )
      writes += 1;
  });

  return () => writes;
}

// A Session's Feed held in the cache as an App that opened it before holds it, with a Server whose `feed.subscribe` a fake link answers.
export function feedLiveFixture({
  seeded = true,
}: { seeded?: boolean } = {}): FeedLiveFixture {
  const queryClient = createQueryClient();
  const link: Link = { state: 'open', listeners: new Set() };
  const server: Server = { opened: [], open: undefined, serve: () => [] };

  let held: FeedLive | undefined;

  const loadTail = (): void => {
    queryClient.setQueryData(
      feedKey(sessionId),
      mergeNewestPage(emptyFeed, page([], 0)),
    );
    queryClient.setQueryData(snapshotKey(sessionId), streamed.snapshot);
  };

  if (seeded) loadTail();

  return {
    queryClient,
    server,
    feedWrites: countWrites(queryClient),
    held: () => queryClient.getQueryData(feedKey(sessionId)),
    send: (data) => server.open?.next({ result: { type: 'data', data } }),
    fail: () =>
      server.open?.error(TRPCClientError.from(new Error('Socket lost'))),
    connect: (state) => {
      link.state = state;

      for (const listener of link.listeners) listener();
    },
    returnToForeground: () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    },
    connection: connectionOf(link),
    client: clientOf(server),
    live: () => held,
    hold: (live) => {
      held = live;
    },
    loadTail,
  };
}

// What the Session screen does with the Feed: it shows it and keeps its subscription open.
function Screen({
  fixture,
  shown,
}: {
  fixture: FeedLiveFixture;
  shown: boolean;
}): JSX.Element {
  const window = useFeedWindow(sessionId, toFeedView, {
    cacheId: sessionId,
    shown,
    tail: false,
  });

  const live = useFeedLive(sessionId, window.cache, shown);

  useEffect(() => fixture.hold(live));

  return (
    <span>{`${window.feed.revision} ${live.closure?.error?.message ?? ''}`}</span>
  );
}

export function FeedLivePreview({
  fixture,
  shown = true,
}: {
  fixture: FeedLiveFixture;
  shown?: boolean;
}): JSX.Element {
  return (
    <ConnectionContext.Provider value={fixture.connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          <Screen fixture={fixture} shown={shown} />
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
