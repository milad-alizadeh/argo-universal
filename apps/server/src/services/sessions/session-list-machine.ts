import type { SessionInfo } from '@repo/contracts';
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  fromCallback,
  type Subscription,
  setup,
} from 'xstate';
import type { FeedActorRef } from '../feed/feed-machine';
import type { writerMachine } from '../feed/writer-machine';
import type { RegistryActorRef } from './registry-machine';

export type SessionListState = { information: SessionInfo; running: boolean }[];
interface SessionListInput {
  sessions: RegistryActorRef;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  readRows: () => SessionListState;
}
type SessionListEvent =
  | { type: 'list.refresh' }
  | { type: 'list.failed'; error: unknown }
  | { type: 'list.stop' };

export const sessionListMachine = setup({
  types: {
    input: {} as SessionListInput,
    context: {} as SessionListInput & {
      failure: unknown;
      rows: SessionListState | null;
    },
    events: {} as SessionListEvent,
    emitted: {} as { type: 'list.rows'; rows: SessionListState },
  },
  actors: {
    observe: fromCallback<SessionListEvent, SessionListInput>(
      ({ input, sendBack }) => {
        const feeds = new Map<FeedActorRef, Subscription>();
        const refresh = () =>
          queueMicrotask(() => sendBack({ type: 'list.refresh' }));
        const connectFeeds = () => {
          const current = new Set<FeedActorRef>();
          for (const actor of Object.values(
            input.sessions.getSnapshot().context.sessions,
          )) {
            const feed = actor.getSnapshot().children.feed as
              | FeedActorRef
              | undefined;
            if (feed) {
              current.add(feed);
              if (!feeds.has(feed))
                feeds.set(
                  feed,
                  feed.subscribe({ next: refresh, error: refresh }),
                );
            }
          }
          for (const [feed, listener] of feeds)
            if (!current.has(feed)) {
              listener.unsubscribe();
              feeds.delete(feed);
            }
          refresh();
        };
        const registry = input.sessions.subscribe({
          next: connectFeeds,
          error: (error) => sendBack({ type: 'list.failed', error }),
          complete: () => sendBack({ type: 'list.stop' }),
        });
        const writer = input.writer?.subscribe({
          next: refresh,
          error: refresh,
        });
        connectFeeds();
        return () => {
          registry.unsubscribe();
          writer?.unsubscribe();
          for (const listener of feeds.values()) listener.unsubscribe();
        };
      },
    ),
  },
  delays: { listRefreshDelay: 100 },
  actions: {
    publishRows: enqueueActions(({ context, enqueue }) => {
      try {
        const rows = context.readRows();
        enqueue.assign({ rows });
        enqueue.emit({ type: 'list.rows', rows });
      } catch (error) {
        enqueue.raise({ type: 'list.failed', error });
      }
    }),
    rememberFailure: assign(({ event }) => {
      assertEvent(event, 'list.failed');
      return { failure: event.error };
    }),
  },
}).createMachine({
  id: 'sessionList',
  context: ({ input }) => ({ ...input, failure: null, rows: null }),
  initial: 'active',
  states: {
    active: {
      invoke: { src: 'observe', input: ({ context }) => context },
      entry: 'publishRows',
      initial: 'idle',
      states: {
        idle: { on: { 'list.refresh': { target: 'pending' } } },
        pending: {
          on: { 'list.refresh': {} },
          after: {
            listRefreshDelay: { target: 'idle', actions: 'publishRows' },
          },
        },
      },
      on: {
        'list.failed': { target: 'failed', actions: 'rememberFailure' },
        'list.stop': { target: 'stopped' },
      },
    },
    failed: { type: 'final' },
    stopped: { type: 'final' },
  },
});
