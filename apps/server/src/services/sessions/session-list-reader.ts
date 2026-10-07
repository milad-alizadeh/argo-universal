import { SessionInfo, SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { and, desc, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ActorRefFrom } from 'xstate';
import type { FeedActorRef } from '../feed/feed-machine';
import { fromFeedRow, newestRows } from '../feed/feed-row';
import {
  applyQueuedSession,
  applyQueuedTurns,
  queuedFeedRows,
  type WriterJob,
} from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';
import { createLiveHeaderRowsReader } from './live-header-rows';
import type { RegistryActorRef } from './registry-machine';
import { latestTurnOf, toSessionInfo } from './session-info';

interface ListReadInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  readLiveHeaderRows: ReturnType<typeof createLiveHeaderRowsReader>;
  validate<Value>(read: () => Value): Value | undefined;
  rejectedSessions: Set<string>;
}

export function createSessionListReader(options: {
  database: Database;
  sessions: RegistryActorRef;
  writer: () => ActorRefFrom<typeof writerMachine> | undefined;
}) {
  const { database, sessions, writer } = options;
  const readLiveHeaderRows = createLiveHeaderRowsReader({ database });
  let rejectedShapes = 0;
  const validate = <Value>(read: () => Value): Value | undefined => {
    try {
      return read();
    } catch (error) {
      rejectedShapes += 1;
      console.error(`sessions: rejected list shape #${rejectedShapes}`, error);
      return undefined;
    }
  };
  const parents = new Map<string, string | null>();
  const readRows = (sessionIds?: readonly string[]) => {
    const input = {
      database,
      writer: writer(),
      validate,
      readLiveHeaderRows,
      rejectedSessions: new Set<string>(),
    };
    if (!sessionIds) parents.clear();
    const ids = sessionIds && new Set(sessionIds);
    if (ids)
      for (const id of ids) {
        const parent = parents.get(id);
        if (parent) ids.add(parent);
      }
    let rows = readListSessions(input, ids && [...ids]);
    const addedParents = new Set<string>();
    for (const row of rows) {
      parents.set(row.id, row.parentSessionId);
      if (
        ids?.has(row.id) &&
        row.parentSessionId &&
        !ids.has(row.parentSessionId)
      )
        addedParents.add(row.parentSessionId);
    }
    if (addedParents.size) {
      for (const id of addedParents) ids?.add(id);
      rows = [
        ...new Map(
          [...rows, ...readListSessions(input, [...addedParents])].map(
            (row) => [row.id, row],
          ),
        ).values(),
      ];
    }
    return rows
      .filter(
        (row) => row.parentSessionId === null && (!ids || ids.has(row.id)),
      )
      .flatMap((row) => {
        const children = rows.filter(
          (child) => child.parentSessionId === row.id,
        );
        const turns = readListTurns(
          input,
          row.id,
          children.map((child) => child.id),
        );
        if (input.rejectedSessions.has(row.id)) return [];
        const result = readSessionInformation({
          ...input,
          sessions,
          turns,
          rows: children.filter(
            (child) => !input.rejectedSessions.has(child.id),
          ),
          row,
        });
        return result ? [result] : [];
      });
  };
  const sessionIdsForJobs = (jobs: readonly WriterJob[]): string[] => [
    ...new Set(
      jobs.flatMap((job) => {
        switch (job.type) {
          case 'feedRows':
            return [job.sessionId];
          case 'sessionInsert':
            return [
              job.session.id,
              ...(job.session.parentSessionId
                ? [job.session.parentSessionId]
                : []),
            ];
          case 'sessionRowUpdate':
            return [
              job.id,
              ...(job.set.parentSessionId ? [job.set.parentSessionId] : []),
            ];
          case 'turnInsert':
            return [job.turn.sessionId];
          case 'turnUpdate': {
            const queued = jobs.find(
              (queued) =>
                queued.type === 'turnInsert' && queued.turn.id === job.id,
            );
            if (queued?.type === 'turnInsert') return [queued.turn.sessionId];
            const live = Object.values(
              sessions.getSnapshot().context.sessions,
            ).find(
              (actor) => actor.getSnapshot().context.activeTurnId === job.id,
            );
            if (live) return [live.getSnapshot().context.sessionId];
            const stored = database
              .select({ sessionId: turn.sessionId })
              .from(turn)
              .where(eq(turn.id, job.id))
              .get();
            const id =
              stored &&
              validate(() => SessionRecord.shape.id.parse(stored.sessionId));
            return id ? [id] : [];
          }
          default: {
            const unhandled: never = job;
            throw new Error(`Unhandled writer job ${unhandled}`);
          }
        }
      }),
    ),
  ];
  const relatedSessionIds = (sessionIds: readonly string[]) => {
    const ids = new Set(sessionIds);
    for (const id of ids) {
      const parent = parents.get(id);
      if (parent) ids.add(parent);
    }
    return [...ids];
  };
  return { readRows, sessionIdsForJobs, relatedSessionIds };
}

function readListSessions(
  input: ListReadInput,
  sessionIds?: readonly string[],
): SessionRecord[] {
  const jobs = input.writer?.getSnapshot().context.queue ?? [];
  const stored = input.database
    .select()
    .from(session)
    .where(
      sessionIds
        ? or(
            inArray(session.id, sessionIds),
            inArray(session.parentSessionId, sessionIds),
          )
        : undefined,
    )
    .all();
  const rows = new Map(stored.map((row) => [row.id, row]));
  const ids = new Set([
    ...rows.keys(),
    ...jobs.flatMap((job) =>
      job.type === 'sessionInsert' &&
      (!sessionIds ||
        sessionIds.includes(job.session.id) ||
        (job.session.parentSessionId &&
          sessionIds.includes(job.session.parentSessionId)))
        ? [job.session.id]
        : [],
    ),
  ]);
  return [...ids].flatMap((id) => {
    const row = input.validate(() =>
      applyQueuedSession({ row: rows.get(id), sessionId: id, jobs }),
    );
    return row ? [row] : [];
  });
}

function readListTurns(
  input: ListReadInput,
  sessionId: string,
  children: string[],
): Turn[] {
  const jobs = input.writer?.getSnapshot().context.queue ?? [];
  const updates = jobs.flatMap((job) =>
    job.type === 'turnUpdate' ? [job.id] : [],
  );
  const unchanged = updates.length ? notInArray(turn.id, updates) : undefined;
  const runningTurn = alias(turn, 'running_turn');
  const running = input.database
    .select({ id: runningTurn.id })
    .from(runningTurn)
    .where(
      and(
        eq(runningTurn.sessionId, session.id),
        eq(runningTurn.status, 'running'),
        updates.length ? notInArray(runningTurn.id, updates) : undefined,
      ),
    )
    .limit(1);
  const runningIds = input.database
    .select({ id: sql<string>`(${running})` })
    .from(session)
    .where(inArray(session.id, children));
  const rows = [
    ...input.database
      .select()
      .from(turn)
      .where(and(eq(turn.sessionId, sessionId), unchanged))
      .orderBy(desc(turn.startedAt), desc(turn.id))
      .limit(1)
      .all(),
    ...(children.length
      ? input.database
          .select()
          .from(turn)
          .where(inArray(turn.id, runningIds))
          .all()
      : []),
    ...(updates.length
      ? input.database
          .select()
          .from(turn)
          .where(
            and(
              inArray(turn.sessionId, [sessionId, ...children]),
              inArray(turn.id, updates),
            ),
          )
          .all()
      : []),
  ];
  const ids = new Set([sessionId, ...children]);
  const parseTurn = (row: typeof turn.$inferSelect | Turn): Turn[] => {
    const parsed = input.validate(() => Turn.parse(row));
    if (!parsed) input.rejectedSessions.add(row.sessionId);
    return parsed ? [parsed] : [];
  };
  return applyQueuedTurns(rows.flatMap(parseTurn), jobs)
    .filter((row) => ids.has(row.sessionId))
    .flatMap(parseTurn);
}

function readSessionInformation(
  input: ListReadInput & {
    sessions: RegistryActorRef;
    row: SessionRecord;
    rows: readonly SessionRecord[];
    turns: readonly Turn[];
  },
): { information: SessionInfo; running: boolean } | undefined {
  const {
    database,
    writer,
    validate,
    readLiveHeaderRows,
    sessions,
    row,
    rows,
    turns,
  } = input;
  const actor = sessions.getSnapshot().context.sessions[row.id];
  const live = actor?.getSnapshot();
  const feed = live?.children.feed as FeedActorRef | undefined;
  const feedContext = feed?.getSnapshot().context;
  const changes = [
    ...(['agent_message', 'plan_update'] as const).flatMap((kind) =>
      database
        .select()
        .from(feedRow)
        .where(
          and(eq(feedRow.sessionId, row.id), eq(feedRow.sessionUpdate, kind)),
        )
        .orderBy(desc(feedRow.position))
        .limit(1)
        .all()
        .map((stored) => validate(() => fromFeedRow(row.id, stored))),
    ),
    ...queuedFeedRows(
      writer?.getSnapshot().context.queue ?? [],
      row.id,
    ).flatMap((job) =>
      job.rows.map((stored) => validate(() => fromFeedRow(row.id, stored))),
    ),
    ...Object.values(feedContext?.rows ?? {}),
  ];
  const rejected = changes.includes(undefined);
  const updates = [
    ...newestRows(changes.filter((row) => row !== undefined)).values(),
  ].sort((first, second) => first.position - second.position);
  const latestTurn = latestTurnOf(turns, row.id);
  const activeTurnId =
    live?.context.activeTurnId ??
    (!live && latestTurn?.status === 'running' ? latestTurn.id : null);
  const header = readLiveHeaderRows({
    writer,
    sessionId: row.id,
    turnId: activeTurnId,
    rows: feedContext?.rows ?? {},
  });
  const result = toSessionInfo({
    row,
    turns,
    message: updates.findLast(
      (update) => update.sessionUpdate === 'agent_message',
    ),
    plan: updates.findLast((update) => update.sessionUpdate === 'plan_update'),
    live: live?.context ?? null,
    feed: feedContext ?? null,
    liveHeaderRows: Object.values(header.rows),
    children: rows.filter((child) => child.parentSessionId === row.id),
  });
  const information = validate(() =>
    SessionInfo.parse({
      ...result.information,
      ...(rejected || header.rejected ? { activity: '', plan: null } : {}),
    }),
  );
  return information ? { information, running: result.running } : undefined;
}
