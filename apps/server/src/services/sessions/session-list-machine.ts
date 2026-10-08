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
import type { WriterJob } from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';
import type { RegistryActorRef } from './registry-machine';
import type { SessionActorRef } from './session-machine';

interface SessionListContext extends SessionListMachineInput {
  failure: unknown;
  rows: SessionListState | null;
  dirty: Set<string> | null;
}

export type SessionListState = { information: SessionInfo; running: boolean }[];
export interface SessionListMachineInput {
  sessions: RegistryActorRef;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  readRows: (sessionIds?: readonly string[]) => SessionListState;
  relatedSessionIds: (sessionIds: readonly string[]) => string[];
  sessionIdsForJobs: (jobs: readonly WriterJob[]) => string[];
}
type SessionListEvent =
  | { type: 'list.refresh'; sessionIds?: readonly string[] }
  | { type: 'list.flush' }
  | { type: 'list.failed'; error: unknown }
  | { type: 'list.stop' };

export const sessionListMachine = setup({
  types: {
    input: {} as SessionListMachineInput,
    context: {} as SessionListContext,
    events: {} as SessionListEvent,
    emitted: {} as { type: 'list.rows'; rows: SessionListState },
  },
  actors: {
    observe: fromCallback<SessionListEvent, SessionListMachineInput>(
      ({ input, sendBack }): (() => void) => {
        const feeds = new Map<FeedActorRef, Subscription>();
        const sessions = new Map<SessionActorRef, Subscription>();
        const refresh = (sessionIds: readonly string[]): void =>
          queueMicrotask((): void =>
            sendBack({ type: 'list.refresh', sessionIds }),
          );
        const connect = (): void => {
          const current = new Set(
            Object.values(input.sessions.getSnapshot().context.sessions),
          );
          const currentFeeds = new Set<FeedActorRef>();
          for (const actor of current) {
            const id = actor.getSnapshot().context.sessionId;
            if (!sessions.has(actor)) {
              sessions.set(
                actor,
                actor.subscribe({
                  next: (): void => refresh([id]),
                  error: (): void => refresh([id]),
                }),
              );
              refresh([id]);
            }
            const feed = actor.getSnapshot().children.feed as
              | FeedActorRef
              | undefined;
            if (feed) {
              currentFeeds.add(feed);
              if (!feeds.has(feed))
                feeds.set(
                  feed,
                  feed.subscribe({
                    next: (): void => refresh([id]),
                    error: (): void => refresh([id]),
                  }),
                );
            }
          }
          for (const [actor, listener] of sessions)
            if (!current.has(actor)) {
              listener.unsubscribe();
              sessions.delete(actor);
              refresh([actor.getSnapshot().context.sessionId]);
            }
          for (const [feed, listener] of feeds)
            if (!currentFeeds.has(feed)) {
              listener.unsubscribe();
              feeds.delete(feed);
            }
        };
        const registry = input.sessions.subscribe({
          next: connect,
          error: (error): void => sendBack({ type: 'list.failed', error }),
          complete: (): void => sendBack({ type: 'list.stop' }),
        });
        let previous = new Set<WriterJob>();
        const changedJobs = (jobs: readonly WriterJob[]): void => {
          try {
            const current = new Set(jobs);
            const changed = [
              ...jobs.filter((job): boolean => !previous.has(job)),
              ...[...previous].filter((job): boolean => !current.has(job)),
            ];
            previous = current;
            if (changed.length) refresh(input.sessionIdsForJobs(changed));
          } catch (error) {
            sendBack({ type: 'list.failed', error });
          }
        };
        const writer = input.writer?.subscribe({
          next: (snapshot): void => changedJobs(snapshot.context.queue),
          error: (): void => changedJobs([]),
        });
        connect();
        changedJobs(input.writer?.getSnapshot().context.queue ?? []);
        return (): void => {
          registry.unsubscribe();
          writer?.unsubscribe();
          for (const listener of feeds.values()) listener.unsubscribe();
          for (const listener of sessions.values()) listener.unsubscribe();
        };
      },
    ),
  },
  delays: { listRefreshDelay: 100 },
  actions: {
    rememberDirty: assign(
      ({ context, event }): Pick<SessionListContext, 'dirty'> => {
        assertEvent(event, 'list.refresh');
        return {
          dirty:
            context.dirty === null || event.sessionIds === undefined
              ? null
              : new Set([...context.dirty, ...event.sessionIds]),
        };
      },
    ),
    publishRows: enqueueActions(({ context, enqueue }): void => {
      try {
        const ids =
          context.dirty && context.relatedSessionIds([...context.dirty]);
        let changed: SessionListState = [];
        if (context.dirty === null) changed = context.readRows();
        else if (context.dirty.size) changed = context.readRows(ids ?? []);
        const cache = new Map(
          (context.dirty === null ? [] : (context.rows ?? [])).map(
            (row): [string, SessionListState[number]] => [
              row.information.sessionId,
              row,
            ],
          ),
        );
        for (const id of context.relatedSessionIds(ids ?? [])) cache.delete(id);
        for (const row of changed) cache.set(row.information.sessionId, row);
        const rows = [...cache.values()];
        enqueue.assign({ rows, dirty: new Set<string>() });
        enqueue.emit({ type: 'list.rows', rows });
      } catch (error) {
        enqueue.raise({ type: 'list.failed', error });
      }
    }),
    rememberFailure: assign(
      ({ event }): Pick<SessionListContext, 'failure'> => {
        assertEvent(event, 'list.failed');
        return { failure: event.error };
      },
    ),
  },
}).createMachine({
  id: 'sessionList',
  context: ({ input }): SessionListContext => ({
    ...input,
    failure: null,
    rows: null,
    dirty: null,
  }),
  initial: 'active',
  states: {
    active: {
      invoke: {
        src: 'observe',
        input: ({ context }): SessionListContext => context,
      },
      entry: 'publishRows',
      initial: 'idle',
      states: {
        idle: {
          on: {
            'list.refresh': { target: 'pending', actions: 'rememberDirty' },
          },
        },
        pending: {
          on: { 'list.refresh': { actions: 'rememberDirty' } },
          after: {
            listRefreshDelay: { target: 'idle', actions: 'publishRows' },
          },
        },
      },
      on: {
        'list.flush': { target: '.idle', actions: 'publishRows' },
        'list.failed': { target: 'failed', actions: 'rememberFailure' },
        'list.stop': { target: 'stopped' },
      },
    },
    failed: { type: 'final' },
    stopped: { type: 'final' },
  },
});
