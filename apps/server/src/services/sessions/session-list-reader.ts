import {
  SessionInfo,
  SessionRecord,
  type SessionUpdate,
  Turn,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { FeedActorRef } from '../feed/feed-machine';
import { fromFeedRow, queuedFeedRows } from '../feed/feed-row';
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
  const storedTurns = new Map(
    database
      .select()
      .from(turn)
      .all()
      .map((row) => [row.id, validate(() => Turn.parse(row))]),
  );
  for (const job of writer?.getSnapshot().context.queue ?? []) {
    if (job.type === 'turnInsert') {
      const previous = storedTurns.get(job.turn.id);
      storedTurns.set(
        job.turn.id,
        validate(() =>
          Turn.parse({
            startedAt: Date.now(),
            endedAt: null,
            error: null,
            usage: null,
            stopReason: null,
            ...previous,
            ...job.turn,
          }),
        ),
      );
    }
    if (job.type === 'turnUpdate') {
      const row = storedTurns.get(job.id);
      if (row)
        storedTurns.set(
          job.id,
          validate(() => Turn.parse({ ...row, ...job.set })),
        );
    }
  }
  return [...storedTurns.values()];
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
    .map((stored) => {
      let row = stored;
      for (const job of jobs) {
        if (job.type === 'sessionRowUpdate' && job.id === row.id)
          row = { ...row, ...job.set };
        if (
          job.type === 'feedRows' &&
          job.sessionId === row.id &&
          job.maxRevision > row.maxRevision
        )
          row = {
            ...row,
            maxRevision: job.maxRevision,
            activityAt: job.activityAt ?? row.activityAt,
          };
      }
      return validate(() => SessionRecord.parse(row));
    });
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
    ...queuedFeedRows(writer, row.id).flatMap((job) =>
      job.rows.map((stored) => validate(() => fromFeedRow(row.id, stored))),
    ),
    ...Object.values(feedContext?.rows ?? {}),
  ];
  const newest = new Map<string, SessionUpdate>();
  for (const change of changes) {
    const known = newest.get(change.id);
    if (!known || change.revision >= known.revision)
      newest.set(change.id, change);
  }
  const updates = [...newest.values()].sort(
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
