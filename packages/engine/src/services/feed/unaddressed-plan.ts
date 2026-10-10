import type { PlanUpdate, SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import {
  hydrateStoredFeedRow,
  newestRows,
  storedFeedColumns,
} from './feed-row';
import type { writerMachine } from './writer-machine';
import { readWriterProjection } from './writer-projection';

type UnaddressedPlanRead = {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  sessionId: string;
  acpSessionId: string;
};
const belongsToAcpSession = (row: PlanUpdate, acpSessionId: string): boolean =>
  row._meta?.argo?.unaddressedPlanAcpSessionId === acpSessionId;
export const isUnaddressedPlan = (
  row: SessionUpdate,
  acpSessionId: string,
): row is PlanUpdate =>
  row.sessionUpdate === 'plan_update' && belongsToAcpSession(row, acpSessionId);
export const selectUnaddressedPlanRow = (
  rows: Iterable<SessionUpdate>,
  acpSessionId: string,
): PlanUpdate | undefined =>
  [...newestRows(rows).values()]
    .filter((row): row is PlanUpdate => isUnaddressedPlan(row, acpSessionId))
    .toSorted((first, second) => second.revision - first.revision)[0];
const createUnaddressedPlanFilter = (
  input: UnaddressedPlanRead,
): SQL | undefined =>
  and(
    eq(feedRow.sessionId, input.sessionId),
    eq(feedRow.sessionUpdate, 'plan_update'),
    eq(
      sql`json_extract(${feedRow.payload}, '$._meta.argo.unaddressedPlanAcpSessionId')`,
      input.acpSessionId,
    ),
  );
const readStoredUnaddressedPlan = (
  input: UnaddressedPlanRead,
): PlanUpdate | undefined => {
  const stored = input.database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(createUnaddressedPlanFilter(input))
    .orderBy(desc(feedRow.revision))
    .limit(1)
    .get();
  return stored
    ? selectUnaddressedPlanRow(
        [hydrateStoredFeedRow(input.sessionId, stored)],
        input.acpSessionId,
      )
    : undefined;
};
export const readUnaddressedPlan = (
  input: UnaddressedPlanRead,
): PlanUpdate | undefined => {
  const stored = readStoredUnaddressedPlan(input);
  const queued = readWriterProjection(input.writer).feed(input.sessionId).rows;
  return selectUnaddressedPlanRow(
    [...(stored ? [stored] : []), ...queued],
    input.acpSessionId,
  );
};
