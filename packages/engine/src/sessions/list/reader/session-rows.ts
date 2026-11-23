import { SessionRecord } from '@repo/contracts';
import { feedRow, session, sessionSchedule } from '@repo/db/schema';
import {
  and,
  eq,
  exists,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { scheduleCreatedNoticeSuffix } from '../../schedule-created';
import {
  storedSessionColumns,
  decodeStoredSession,
} from '../../session-record';
import {
  readQueuedSessionRows,
  type QueuedSessionRows,
} from '../../session-storage';
import type { ListReadInput } from './input';
import { shellCountColumns } from './shell-counts';

type StoredSession = typeof session.$inferSelect & {
  isTask: number;
  hasCreationNotice: number;
  shellTotal: number;
  shellRunning: number;
};

export function readListSessions(
  input: ListReadInput,
  sessionIds?: readonly string[],
): SessionRecord[] {
  const projection = readQueuedSessionRows(input.writer);

  const stored = storedSessions(input, sessionIds);
  rememberListFacts(input, stored);

  const rows = new Map(
    stored.map((row): [string, typeof row] => [row.id, row]),
  );

  const ids = new Set([...rows.keys(), ...projection.sessionIds(sessionIds)]);

  return [...ids].flatMap((id): SessionRecord[] =>
    projectedSession({ input, projection, rows, id }),
  );
}

function storedSessions(
  input: ListReadInput,
  sessionIds: readonly string[] | undefined,
): StoredSession[] {
  const tasks = input.database
    .select({ id: sessionSchedule.sessionId })
    .from(sessionSchedule)
    .where(isNotNull(sessionSchedule.task));

  return input.database
    .select({
      ...storedSessionColumns,
      ...shellCountColumns(input.database),
      isTask: sql<number>`${session.id} in (${tasks})`,
      hasCreationNotice: creationNotice(input),
    })
    .from(session)
    .where(sessionFilter(sessionIds))
    .all();
}

function creationNotice({ database }: ListReadInput): SQL<number> {
  return sql<number>`${exists(
    database
      .select({ id: feedRow.id })
      .from(feedRow)
      .where(
        and(
          eq(feedRow.sessionId, session.id),
          eq(
            feedRow.id,
            sql<string>`${session.id} || ${scheduleCreatedNoticeSuffix}`,
          ),
        ),
      ),
  )}`;
}

type ProjectedSessionInput = {
  input: ListReadInput;
  projection: QueuedSessionRows;
  rows: Map<string, typeof session.$inferSelect>;
  id: string;
};

function projectedSession({
  input,
  projection,
  rows,
  id,
}: ProjectedSessionInput): SessionRecord[] {
  const row = input.validate((): ReturnType<typeof projection.session> => {
    const stored = rows.get(id);

    return projection.session(
      stored && SessionRecord.parse(decodeStoredSession(stored)),
      id,
    );
  });

  return row ? [row] : [];
}

function sessionFilter(ids: readonly string[] | undefined): SQL | undefined {
  return ids
    ? or(
        inArray(session.id, ids),
        inArray(session.parentSessionId, ids),
        inArray(session.startedBySessionId, ids),
      )
    : undefined;
}

function rememberListFacts(
  input: ListReadInput,
  stored: StoredSession[],
): void {
  for (const row of stored) {
    if (row.isTask) input.taskSessionIds.add(row.id);

    if (row.hasCreationNotice) input.seededSessionIds.add(row.id);

    input.shellCounts.set(row.id, {
      total: row.shellTotal,
      running: row.shellRunning,
    });
  }
}
