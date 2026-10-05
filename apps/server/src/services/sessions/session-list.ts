import type { SessionService } from '@repo/api';
import type {
  SessionCounts,
  SessionListInput,
  SessionListUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import type { ActorRefFrom, Subscription } from 'xstate';
import { z } from 'zod';
import type { FeedActorRef } from '../feed/feed-machine';
import type { writerMachine } from '../feed/writer-machine';
import type { RegistryActorRef } from './registry-machine';
import { createSessionListReader } from './session-list-reader';

const cursorSchema = z.strictObject({
  activityAt: z.int(),
  sessionId: z.string(),
});
const pageSize = 50;

export function createSessionList(options: {
  database: Database;
  sessions: RegistryActorRef;
}): Pick<SessionService, 'list' | 'listUpdates' | 'counts'> {
  const { sessions } = options;
  const writer = () =>
    sessions.system.get('databaseWriter') as
      | ActorRefFrom<typeof writerMachine>
      | undefined;
  const readAll = createSessionListReader({
    database: options.database,
    sessions,
    writer,
  });
  const list = async (input: SessionListInput) => {
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (input.cursor !== undefined) {
      try {
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')),
        );
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Session list cursor',
        });
      }
    }
    const rows = readAll()
      .map((row) => row.information)
      .filter(
        (row) =>
          (input.projectId === undefined ||
            row.projectId === input.projectId) &&
          (row.archivedAt !== null) === input.archived &&
          (input.query === undefined ||
            row.title
              .toLocaleLowerCase()
              .includes(input.query.toLocaleLowerCase())) &&
          (!cursor ||
            row.activityAt < cursor.activityAt ||
            (row.activityAt === cursor.activityAt &&
              row.sessionId < cursor.sessionId)),
      )
      .sort(
        (first, second) =>
          second.activityAt - first.activityAt ||
          (first.sessionId < second.sessionId
            ? 1
            : first.sessionId > second.sessionId
              ? -1
              : 0),
      );
    const page = rows.slice(0, pageSize);
    const last = page.at(-1);
    return {
      sessions: page,
      nextCursor:
        rows.length > pageSize && last
          ? Buffer.from(
              JSON.stringify({
                activityAt: last.activityAt,
                sessionId: last.sessionId,
              }),
            ).toString('base64url')
          : null,
    };
  };
  const readCounts = (rows: ReturnType<typeof readAll>): SessionCounts => {
    const active = rows.filter((row) => row.information.archivedAt === null);
    return {
      attention: active.filter(
        (row) =>
          row.information.status === 'needs_input' ||
          row.information.status === 'unread',
      ).length,
      running: active.filter((row) => row.running).length,
    };
  };
  async function* watch<Value>(
    signal: AbortSignal | undefined,
    changes: (rows: ReturnType<typeof readAll>) => Value[],
  ): AsyncGenerator<Value> {
    const queue: Value[] = [];
    const feeds = new Map<FeedActorRef, Subscription>();
    let wake: (() => void) | undefined;
    let scheduled = false;
    let finished = false;
    let failure: unknown;
    const refresh = () => {
      if (finished || signal?.aborted) return;
      try {
        const current = new Set<FeedActorRef>();
        for (const actor of Object.values(
          sessions.getSnapshot().context.sessions,
        )) {
          const feed = actor.getSnapshot().children.feed as
            | FeedActorRef
            | undefined;
          if (feed) {
            current.add(feed);
            if (!feeds.has(feed)) feeds.set(feed, feed.subscribe(schedule));
          }
        }
        for (const [feed, listener] of feeds)
          if (!current.has(feed)) {
            listener.unsubscribe();
            feeds.delete(feed);
          }
        queue.push(...changes(readAll()));
      } catch (error) {
        failure = error;
        finished = true;
      }
      wake?.();
    };
    const schedule = () => {
      if (scheduled || finished) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        refresh();
      });
    };
    const end = () => {
      finished = true;
      wake?.();
    };
    const registryListener = sessions.subscribe({
      next: schedule,
      complete: end,
    });
    const writerListener = writer()?.subscribe(schedule);
    signal?.addEventListener('abort', end);
    try {
      refresh();
      while (!signal?.aborted && !finished) {
        if (queue.length) {
          yield queue.shift() as Value;
          continue;
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = undefined;
      }
      if (failure) throw failure;
    } finally {
      finished = true;
      registryListener.unsubscribe();
      writerListener?.unsubscribe();
      for (const listener of feeds.values()) listener.unsubscribe();
      signal?.removeEventListener('abort', end);
    }
  }
  return {
    list,
    listUpdates: (signal) => {
      let previous = new Map<string, string>();
      return watch<SessionListUpdate>(signal, (state) => {
        const rows = state.map((row) => row.information);
        const next = new Map(
          rows.map((row) => [row.sessionId, JSON.stringify(row)]),
        );
        const changed: SessionListUpdate[] = rows
          .filter(
            (row) => previous.get(row.sessionId) !== next.get(row.sessionId),
          )
          .map((row) => ({ type: 'changed', session: row }));
        for (const sessionId of previous.keys())
          if (!next.has(sessionId))
            changed.push({ type: 'removed', sessionId });
        previous = next;
        return changed;
      });
    },
    counts: (signal) => {
      let previous = '';
      return watch<SessionCounts>(signal, (rows) => {
        const counts = readCounts(rows);
        const serialized = JSON.stringify(counts);
        if (serialized === previous) return [];
        previous = serialized;
        return [counts];
      });
    },
  };
}
