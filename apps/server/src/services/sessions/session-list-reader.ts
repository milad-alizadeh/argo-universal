import { SessionInfo, SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { FeedActorRef } from '../feed/feed-machine';
import { fromFeedRow, newestRows } from '../feed/feed-row';
import {
  applyQueuedSession,
  applyQueuedTurns,
  queuedFeedRows,
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
  return () => {
    const input = {
      database,
      writer: writer(),
      validate,
      readLiveHeaderRows,
      rejectedSessions: new Set<string>(),
    };
    const turns = readListTurns(input);
    const rows = readListSessions(input).filter(
      (row) => !input.rejectedSessions.has(row.id),
    );
    return rows
      .filter((row) => row.parentSessionId === null)
      .flatMap((row) => {
        const result = readSessionInformation({
          ...input,
          sessions,
          turns,
          rows,
          row,
        });
        return result ? [result] : [];
      });
  };
}

function readListTurns(input: ListReadInput): Turn[] {
  const { database, writer, validate, rejectedSessions } = input;
  const parseTurn = (row: typeof turn.$inferSelect | Turn): Turn[] => {
    const parsed = validate(() => Turn.parse(row));
    if (!parsed) rejectedSessions.add(row.sessionId);
    return parsed ? [parsed] : [];
  };
  const stored = database.select().from(turn).all().flatMap(parseTurn);
  return applyQueuedTurns(
    stored,
    writer?.getSnapshot().context.queue ?? [],
  ).flatMap(parseTurn);
}

function readListSessions({
  database,
  writer,
  validate,
}: ListReadInput): SessionRecord[] {
  const jobs = writer?.getSnapshot().context.queue ?? [];
  return database
    .select()
    .from(session)
    .all()
    .flatMap((row) => {
      const parsed = validate(() =>
        SessionRecord.parse(
          applyQueuedSession({ row, sessionId: row.id, jobs }),
        ),
      );
      return parsed ? [parsed] : [];
    });
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
