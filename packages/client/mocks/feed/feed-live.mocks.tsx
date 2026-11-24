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
import { type JSX, useEffect, useState } from 'react';
import {
  ConnectionContext,
  useConnectionState,
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
import { type Link, connectionOf, watchConnection } from './connection-link';
import { OldSubscribeInput, refusalOf } from './old-feed-server';

const sessionId = 'session-1';

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
  // The `after` of each `feed.subscribe` an old Server accepted: the input it knew, and plain events.
  legacyOpened: FeedSubscribeInput['after'][];
  // How many `feed.subscribe` an old Server refused for a key it did not know.
  refused: number;
  // Whether each `feed.subscribe` the App opened asked for the tail.
  tailAsked: boolean[];
  // Each `feed.page` the App read.
  pageReads: FeedPageInput[];
  open: Wire | undefined;
  // How many `feed.subscribe` the App has closed.
  closed: number;
  // The tail page the Server answers; null holds the answer back.
  tail: Promise<FeedPageOutput>;
  // A Server built before the tail and event ids.
  old: boolean;
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
  { lastEventId, tail = false }: FeedSubscribeInput,
): void {
  server.opened.push(lastEventId);
  server.tailAsked.push(tail);
  server.open = wire;
  wire.next({ result: { type: 'started' } });

  // The tail waits for the test, then comes with the snapshot, as the Server opens a cold App.
  if (tail)
    void server.tail.then((page) => {
      wire.next({
        result: {
          type: 'data',
          data: { type: 'tail', page },
          id: feedEventId({ epoch: page.epoch, revision: page.maxRevision }),
        },
      });
      wire.next({
        result: {
          type: 'data',
          data: { type: 'snapshot', snapshot: streamed.snapshot },
          id: feedEventId({ epoch: page.epoch, revision: page.maxRevision }),
        },
      });
    });

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

// An old Server refuses a key it does not know as a bad request, as its strict input did.
function openOldSubscription(
  server: Server,
  wire: Wire,
  input: ReturnType<typeof OldSubscribeInput.safeParse>,
): void {
  if (!input.success) {
    server.refused += 1;
    wire.error(refusalOf(input.error));

    return;
  }

  const { after } = input.data;

  server.legacyOpened.push(after);
  server.open = wire;
  wire.next({ result: { type: 'started' } });

  for (const data of replayAbove(after ? feedEventId(after) : undefined))
    wire.next({ result: { type: 'data', data } });
}

function clientOf(server: Server): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      () =>
        ({ op }) =>
          observable((wire: Wire) => {
            if (op.path === 'feed.page') {
              answerPage(server, wire, FeedPageInput.parse(op.input));

              return (): void => {};
            }

            if (op.path !== 'feed.subscribe')
              throw new Error(`Unexpected request: ${op.path}`);

            if (server.old) {
              openOldSubscription(
                server,
                wire,
                OldSubscribeInput.safeParse(op.input),
              );

              return (): void => {
                server.closed += 1;
              };
            }

            openSubscription(server, wire, FeedSubscribeInput.parse(op.input));

            return (): void => {
              server.closed += 1;
            };
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
  // The Connection changes state; this settles once the screen has drawn it.
  connect: (state: ConnectionState) => Promise<void>;
  noteConnection: (state: ConnectionState) => void;
  // The Session is shown to the reader, or hidden from them.
  show: (shown: boolean) => void;
  onShown: (set: (shown: boolean) => void) => void;
  connection: Connection;
  client: TRPCClient<AppRouter>;
  // What the screen holds of the Session's Feed, as of its last render.
  held: () => ReturnType<typeof useSessionFeed> | undefined;
  hold: (feed: ReturnType<typeof useSessionFeed>) => void;
  // Every open error the screen has drawn.
  openErrors: () => Error[];
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

const newServer = (tail: Promise<FeedPageOutput>, old: boolean): Server => ({
  old,
  opened: [],
  legacyOpened: [],
  refused: 0,
  tailAsked: [],
  pageReads: [],
  open: undefined,
  closed: 0,
  tail,
});

// A Session's Feed as an App that opened it before holds it (unless `seeded` is false, and then its tail page waits for `answerTail`), with a Server whose answers a fake link gives.
export function feedLiveFixture({
  seeded = true,
  oldServer = false,
}: { seeded?: boolean; oldServer?: boolean } = {}): FeedLiveFixture {
  const queryClient = createQueryClient();
  const link: Link = { state: 'open', listeners: new Set() };
  const answer = Promise.withResolvers<FeedPageOutput>();

  const server = newServer(answer.promise, oldServer);
  const watching = watchConnection(link);
  let held: ReturnType<typeof useSessionFeed> | undefined;
  const drawnErrors: Error[] = [];
  let setShown: ((shown: boolean) => void) | undefined;

  if (seeded) seed(queryClient);

  return {
    queryClient,
    server,
    feedWrites: countWrites(queryClient),
    send: (data) => server.open?.next({ result: { type: 'data', data } }),
    fail: () =>
      server.open?.error(TRPCClientError.from(new Error('Socket lost'))),
    connect: watching.connect,
    noteConnection: watching.note,
    show: (shown) => setShown?.(shown),
    onShown: (set) => {
      setShown = set;
    },
    connection: connectionOf(link),
    client: clientOf(server),
    held: () => held,
    openErrors: () => drawnErrors,
    hold: (feed) => {
      if (feed.openError) drawnErrors.push(new Error(feed.openError.message));
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
  const [visible, setVisible] = useState(shown);
  const feed = useSessionFeed(sessionId, undefined, visible);
  const connection = useConnectionState();

  useEffect(() => fixture.hold(feed));
  useEffect(() => fixture.onShown(setVisible), [fixture]);
  useEffect(() => fixture.noteConnection(connection), [fixture, connection]);

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
