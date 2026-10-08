import { EventEmitter, on } from 'node:events';
import type { SessionService } from '@repo/api';
import type {
  SessionCounts,
  SessionListInput,
  SessionListOutput,
  SessionListUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { type ActorRefFrom, createActor } from 'xstate';
import { z } from 'zod';
import { findDatabaseWriter, type writerMachine } from '../feed';
import type { RegistryActorRef } from './registry-machine';
import {
  type SessionListMachineInput,
  type SessionListState,
  sessionListMachine,
} from './session-list-machine';
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
  const writer = (): ActorRefFrom<typeof writerMachine> | undefined =>
    findDatabaseWriter(sessions.system);
  const {
    readRows: readAll,
    sessionIdsForJobs,
    relatedSessionIds,
  } = createSessionListReader({
    database: options.database,
    sessions,
    writer,
  });
  const { watch, readCachedRows } = createSessionListWatch({
    sessions,
    writer,
    readRows: readAll,
    sessionIdsForJobs,
    relatedSessionIds,
  });
  const list = async (input: SessionListInput): Promise<SessionListOutput> => {
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
    const rows = readCachedRows()
      .map((row): typeof row.information => row.information)
      .filter(
        (row): boolean =>
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
      .sort((first, second): number => {
        const activityOrder = second.activityAt - first.activityAt;
        if (activityOrder) return activityOrder;
        if (first.sessionId < second.sessionId) return 1;
        if (first.sessionId > second.sessionId) return -1;
        return 0;
      });
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
    const active = rows.filter(
      (row): boolean => row.information.archivedAt === null,
    );
    return {
      attention: active.filter(
        (row): boolean =>
          row.information.status === 'needs_input' ||
          row.information.status === 'unread',
      ).length,
      running: active.filter((row): boolean => row.running).length,
    };
  };

  return {
    list,
    listUpdates: (signal): ReturnType<typeof watch<SessionListUpdate>> => {
      let previous = new Map<string, string>();
      return watch<SessionListUpdate>(signal, (state): SessionListUpdate[] => {
        const rows = state.map(
          (row): typeof row.information => row.information,
        );
        const next = new Map(
          rows.map((row): [string, string] => [
            row.sessionId,
            JSON.stringify(row),
          ]),
        );
        const changed: SessionListUpdate[] = rows
          .filter(
            (row): boolean =>
              previous.get(row.sessionId) !== next.get(row.sessionId),
          )
          .map(
            (
              row,
            ): Extract<
              import('@repo/contracts').SessionListUpdate,
              { type: 'changed' }
            > => ({ type: 'changed', session: row }),
          );
        for (const sessionId of previous.keys())
          if (!next.has(sessionId))
            changed.push({ type: 'removed', sessionId });
        previous = next;
        return changed;
      });
    },
    counts: (signal): ReturnType<typeof watch<SessionCounts>> => {
      let previous = '';
      return watch<SessionCounts>(signal, (rows): SessionCounts[] => {
        const counts = readCounts(rows);
        const serialized = JSON.stringify(counts);
        if (serialized === previous) return [];
        previous = serialized;
        return [counts];
      });
    },
  };
}

function createSessionListWatch({
  sessions,
  writer,
  readRows,
  sessionIdsForJobs,
  relatedSessionIds,
}: Omit<SessionListMachineInput, 'writer'> & {
  writer: () => SessionListMachineInput['writer'];
}): {
  watch: <Value>(
    signal: AbortSignal | undefined,
    changes: (rows: SessionListState) => Value[],
  ) => AsyncGenerator<Value>;
  readCachedRows: () => SessionListState;
} {
  let sharedActor: ActorRefFrom<typeof sessionListMachine> | undefined;
  let references = 0;
  const create = (): import('xstate').Actor<typeof sessionListMachine> =>
    createActor(sessionListMachine, {
      input: {
        sessions,
        writer: writer(),
        readRows,
        sessionIdsForJobs,
        relatedSessionIds,
      },
    });
  const readCachedRows = (): SessionListState => {
    const actor = sharedActor ?? create().start();
    try {
      actor.send({ type: 'list.flush' });
      const snapshot = actor.getSnapshot();
      if (snapshot.status === 'error') throw snapshot.error;
      if (snapshot.matches('failed')) throw snapshot.context.failure;
      return snapshot.context.rows ?? [];
    } finally {
      if (!sharedActor) {
        actor.send({ type: 'list.stop' });
        actor.stop();
      }
    }
  };
  async function* watch<Value>(
    signal: AbortSignal | undefined,
    changes: (rows: SessionListState) => Value[],
  ): AsyncGenerator<Value> {
    if (signal?.aborted) return;
    const events = new EventEmitter();
    const controller = new AbortController();
    const first = sharedActor === undefined;
    sharedActor ??= create();
    const actor = sharedActor;
    references += 1;
    const publish = (rows: SessionListState): void => {
      for (const change of changes(rows)) events.emit('change', change);
    };
    const rowsListener = actor.on('list.rows', ({ rows }): void => {
      publish(rows);
    });
    const stream = on(events, 'change', { signal: controller.signal });
    const completion = actor.subscribe({
      complete: (): void => controller.abort(),
      error: (error): void => controller.abort(error),
    });
    let attached = true;
    const release = (): void => {
      if (!attached) return;
      attached = false;
      rowsListener.unsubscribe();
      completion.unsubscribe();
      signal?.removeEventListener('abort', abort);
      references -= 1;
      if (references === 0) {
        actor.send({ type: 'list.stop' });
        actor.stop();
        sharedActor = undefined;
      }
    };
    const abort = (): void => {
      controller.abort();
      release();
    };
    signal?.addEventListener('abort', abort);
    try {
      if (first) actor.start();
      else {
        const rows = actor.getSnapshot().context.rows;
        if (rows) publish(rows);
      }
      for await (const [change] of stream) yield change as Value;
    } catch (error) {
      const snapshot = actor.getSnapshot();
      if (snapshot.status === 'error') throw snapshot.error;
      if (snapshot.matches('failed')) throw snapshot.context.failure;
      if (!controller.signal.aborted) throw error;
    } finally {
      controller.abort();
      release();
    }
  }
  return { watch, readCachedRows };
}
