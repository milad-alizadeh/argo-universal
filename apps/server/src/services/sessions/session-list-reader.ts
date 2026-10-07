import { SessionInfo, SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
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
import { readLiveHeaderRows } from './live-header-rows';
import type { RegistryActorRef } from './registry-machine';
import { latestTurnOf, toSessionInfo } from './session-info';

interface ListReadInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  validate<Value>(read: () => Value): Value;
}

export function createSessionListReader(options: {
  database: Database;
  sessions: RegistryActorRef;
  writer: () => ActorRefFrom<typeof writerMachine> | undefined;
}) {
  const { database, sessions, writer } = options;
  let rejectedShapes = 0;
  const validate = <Value>(read: () => Value): Value => {
    try {
      return read();
    } catch (error) {
      rejectedShapes += 1;
      console.error(`sessions: rejected list shape #${rejectedShapes}`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unrecognised Session list data',
      });
    }
  };
  return () => {
    const input = { database, writer: writer(), validate };
    const turns = readListTurns(input);
    const rows = readListSessions(input);
    return rows
      .filter((row) => row.parentSessionId === null)
      .map((row) =>
        readSessionInformation({ ...input, sessions, turns, rows, row }),
      );
  };
}

function readListTurns({ database, writer, validate }: ListReadInput): Turn[] {
  return validate(() =>
    applyQueuedTurns(
      database
        .select()
        .from(turn)
        .all()
        .map((row) => Turn.parse(row)),
      writer?.getSnapshot().context.queue ?? [],
    ),
  );
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
    .map((row) =>
      validate(() =>
        SessionRecord.parse(
          applyQueuedSession({ row, sessionId: row.id, jobs }),
        ),
      ),
    );
}

function readSessionInformation(
  input: ListReadInput & {
    sessions: RegistryActorRef;
    row: SessionRecord;
    rows: readonly SessionRecord[];
    turns: readonly Turn[];
  },
): { information: SessionInfo; running: boolean } {
  const { database, writer, validate, sessions, row, rows, turns } = input;
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
  const updates = [...newestRows(changes).values()].sort(
    (first, second) => first.position - second.position,
  );
  const latestTurn = latestTurnOf(turns, row.id);
  const activeTurnId =
    live?.context.activeTurnId ??
    (!live && latestTurn?.status === 'running' ? latestTurn.id : null);
  const result = validate(() =>
    toSessionInfo({
      row,
      turns,
      message: updates.findLast(
        (update) => update.sessionUpdate === 'agent_message',
      ),
      plan: updates.findLast(
        (update) => update.sessionUpdate === 'plan_update',
      ),
      live: live?.context ?? null,
      feed: feedContext ?? null,
      liveHeaderRows: Object.values(
        readLiveHeaderRows({
          database,
          writer,
          sessionId: row.id,
          turnId: activeTurnId,
          rows: feedContext?.rows ?? {},
        }),
      ),
      children: rows.filter((child) => child.parentSessionId === row.id),
    }),
  );
  return {
    information: validate(() => SessionInfo.parse(result.information)),
    running: result.running,
  };
}
