import {
  FeedPageInput,
  type FeedPageOutput,
  type FeedSubscribeOutput,
  feedEventId,
  FeedSubscribeInput,
  syncPointOfEventId,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { QueryClientProvider } from '@tanstack/react-query';
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
import { feedKey, snapshotKey } from '../../src/features/feed/api/feed-query';
import { useSessionFeed } from '../../src/features/feed/hooks/use-session-feed';
import {
  emptyFeed,
  type FeedState,
  mergeNewestPage,
} from '../../src/features/feed/view/feed-state';
import { createQueryClient } from '../../src/query-cache';
import { page, rowEvents, streamed } from '../feed-state.mocks';

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
  {
    result:
      | {
          type: 'data';
          data: FeedSubscribeOutput | FeedPageOutput;
          id?: string;
        }
      | { type: 'started' };
  },
  TRPCClientError<AppRouter>
>;

// A Server that answers the Feed's reads and subscription from the recorded stream, and records what it was asked.
interface Server {
  // The `lastEventId` of each `feed.subscribe` the App opened.
  opened: (string | undefined)[];
  // Each `feed.page` the App read.
  pageReads: FeedPageInput[];
  open: Wire | undefined;
  // The tail page the Server answers; null holds the answer back.
  tail: Promise<FeedPageOutput>;
}

// Every change in the recorded stream above the revision the App holds, as the Server replays them; none once the App holds the newest.
function replayAbove(lastEventId: string | undefined): FeedSubscribeOutput[] {
  const held = lastEventId ? syncPointOfEventId(lastEventId) : null;

  return rowEvents(streamed.stream).filter(
    (event) => !('rev' in event) || event.rev > (held?.revision ?? -1),
  );
}

// The tail waits for the test; the page before a cursor is the recorded rows before it.
function answerPage(server: Server, wire: Wire, input: FeedPageInput): void {
  server.pageReads.push(input);

  const answer =
    input.direction === 'before'
      ? Promise.resolve(
          page(streamed.rows, streamed.snapshot.maxRevision, {
            before: input.cursor,
            limit: 2,
          }),
        )
      : server.tail;

  void answer.then((data) => {
    wire.next({ result: { type: 'data', data } });
    wire.complete();
  });
}

function openSubscription(
  server: Server,
  wire: Wire,
  { lastEventId }: FeedSubscribeInput,
): void {
  server.opened.push(lastEventId);
  server.open = wire;
  wire.next({ result: { type: 'started' } });

  // Each row event has the id tRPC's client resumes from.
  for (const data of replayAbove(lastEventId))
    wire.next({
      result: {
        type: 'data',
        data,
        id:
          'rev' in data
            ? feedEventId({ epoch: 0, revision: data.rev })
            : undefined,
      },
    });
}

function clientOf(server: Server): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      () =>
        ({ op }) =>
          observable((wire: Wire) => {
            if (op.path === 'feed.page')
              answerPage(server, wire, FeedPageInput.parse(op.input));
            else if (op.path === 'feed.subscribe')
              openSubscription(
                server,
                wire,
                FeedSubscribeInput.parse(op.input),
              );
            else throw new Error(`Unexpected request: ${op.path}`);
          }),
    ],
  });
}

export interface FeedLiveFixture {
  queryClient: ReturnType<typeof createQueryClient>;
  server: Server;
  // How many times the Session's Feed query was written.
  feedWrites: () => number;
  // Sends the open subscription an event, as the Server does.
  send: (event: FeedSubscribeOutput) => void;
  // Ends the open subscription with an error, as a dropped socket does.
  fail: () => void;
  // The Connection changes state.
  connect: (state: ConnectionState) => void;
  connection: Connection;
  client: TRPCClient<AppRouter>;
  // What the screen holds of the Session's Feed, as of its last render.
  held: () => ReturnType<typeof useSessionFeed> | undefined;
  hold: (feed: ReturnType<typeof useSessionFeed>) => void;
  // The rows the Session's Feed query holds.
  window: () => FeedState | undefined;
  // The tail page arrives.
  answerTail: (tail?: FeedPageOutput) => void;
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

function seed(queryClient: ReturnType<typeof createQueryClient>): void {
  queryClient.setQueryData(
    feedKey(sessionId),
    mergeNewestPage(emptyFeed, page([], 0)),
  );
  queryClient.setQueryData(snapshotKey(sessionId), streamed.snapshot);
}

// A Session's Feed as an App that opened it before holds it (unless `seeded` is false, and then its tail page waits for `answerTail`), with a Server whose answers a fake link gives.
export function feedLiveFixture({
  seeded = true,
}: { seeded?: boolean } = {}): FeedLiveFixture {
  const queryClient = createQueryClient();
  const link: Link = { state: 'open', listeners: new Set() };
  const answer = Promise.withResolvers<FeedPageOutput>();

  const server: Server = {
    opened: [],
    pageReads: [],
    open: undefined,
    tail: answer.promise,
  };

  let held: ReturnType<typeof useSessionFeed> | undefined;

  if (seeded) seed(queryClient);

  return {
    queryClient,
    server,
    feedWrites: countWrites(queryClient),
    send: (data) => server.open?.next({ result: { type: 'data', data } }),
    fail: () =>
      server.open?.error(TRPCClientError.from(new Error('Socket lost'))),
    connect: (state) => {
      link.state = state;

      for (const listener of link.listeners) listener();
    },
    connection: connectionOf(link),
    client: clientOf(server),
    held: () => held,
    hold: (feed) => {
      held = feed;
    },
    window: () => queryClient.getQueryData(feedKey(sessionId)),
    answerTail: (tail = page([], 0)) => answer.resolve(tail),
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
  const feed = useSessionFeed(sessionId, undefined, shown);

  useEffect(() => fixture.hold(feed));

  return <span>{`${feed.revision} ${feed.openError?.message ?? ''}`}</span>;
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
