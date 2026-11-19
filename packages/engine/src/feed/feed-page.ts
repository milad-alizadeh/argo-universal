import type {
  FeedPageInput,
  FeedPageOutput,
  PlanUpdate,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, lt, sql, type SQL } from 'drizzle-orm';
import type { FeedDeps } from './feed';
import {
  hydrateStoredFeedRow,
  storedFeedColumns,
  type FeedRowWrite,
} from './feed-row';

const isStaleCursor = (input: FeedPageInput, epoch: number): boolean =>
  input.epoch !== undefined && input.epoch !== epoch;

const pageCursor = (
  input: FeedPageInput,
  epoch: number,
): number | undefined => {
  if (isStaleCursor(input, epoch)) return undefined;

  return input.direction === 'before' ? input.cursor : undefined;
};

function readPageRows(
  database: Database,
  input: FeedPageInput & { childSessionId?: string },
  cursor: number | undefined,
): FeedRowWrite[] {
  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(pageWhere(input, cursor))
    .orderBy(desc(feedRow.position))
    .limit(input.limit + 1)
    .all();
}

const pageWhere = (
  input: FeedPageInput & { childSessionId?: string },
  cursor: number | undefined,
): SQL | undefined =>
  and(
    eq(feedRow.sessionId, input.sessionId),
    beforeCursor(cursor),
    reportFilter(input.childSessionId),
  );

const beforeCursor = (cursor: number | undefined): SQL | undefined =>
  cursor === undefined ? undefined : lt(feedRow.position, cursor);

function reportFilter(childSessionId: string | undefined): SQL | undefined {
  if (childSessionId === undefined) return undefined;

  return and(
    eq(feedRow.sessionUpdate, 'subagent_update'),
    sql`case when json_valid(${feedRow.payload}) then json_extract(${feedRow.payload}, '$.subagentSessionId') = ${childSessionId} and json_type(${feedRow.payload}, '$._meta.argo.result') = 'array' else false end`,
  );
}

// The Plan with the latest content, by `_meta.argo.contentRevision` (ADR-0007).
const planContentOrder = sql`coalesce(json_extract(${feedRow.payload}, '$._meta.argo.contentRevision'), ${feedRow.revision})`;

const planWhere = (sessionId: string): SQL | undefined =>
  and(
    eq(feedRow.sessionId, sessionId),
    eq(feedRow.sessionUpdate, 'plan_update'),
  );

function readLatestPlan(
  database: Database,
  sessionId: string,
): SessionUpdate | undefined {
  const [stored] = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(planWhere(sessionId))
    .orderBy(desc(planContentOrder))
    .limit(1)
    .all();

  return stored && hydrateStoredFeedRow(sessionId, stored);
}

type PageContent = Pick<FeedPageOutput, 'hasOlder' | 'startCursor'>;

// Only the Session's own pages with older rows can start after its Plan.
const mayStartAfterPlan = (
  input: FeedPageInput & { childSessionId?: string },
  content: PageContent,
): boolean => input.childSessionId === undefined && content.hasOlder;

const startsAfter = (position: number, { startCursor }: PageContent): boolean =>
  position < (startCursor ?? Infinity);

const isBefore = (
  row: SessionUpdate | undefined,
  content: PageContent,
): row is PlanUpdate =>
  row?.sessionUpdate === 'plan_update' && startsAfter(row.position, content);

// A Plan keeps its first position, so a page that starts after it carries it beside its rows.
function planBeforePage(
  database: Database,
  input: FeedPageInput & { childSessionId?: string },
  content: PageContent,
): Pick<FeedPageOutput, 'plan'> {
  if (!mayStartAfterPlan(input, content)) return {};
  const plan = readLatestPlan(database, input.sessionId);

  return isBefore(plan, content) ? { plan } : {};
}

const hydratePageRows = (
  stored: FeedRowWrite[],
  input: FeedPageInput,
): SessionUpdate[] =>
  stored
    .slice(0, input.limit)
    .reverse()
    .map((row): SessionUpdate => hydrateStoredFeedRow(input.sessionId, row));

function pageContent(
  stored: FeedRowWrite[],
  input: FeedPageInput,
): Pick<FeedPageOutput, 'rows' | 'hasOlder' | 'startCursor'> {
  const rows = hydratePageRows(stored, input);

  return {
    rows,
    hasOlder: stored.length > input.limit,
    startCursor: rows[0]?.position ?? null,
  };
}

export function readFeedPage(
  { database, readSession }: Pick<FeedDeps, 'database' | 'readSession'>,
  input: FeedPageInput & { childSessionId?: string },
): FeedPageOutput {
  const { epoch, maxRevision } = readSession(input.sessionId);
  const stored = readPageRows(database, input, pageCursor(input, epoch));
  const content = pageContent(stored, input);

  return {
    epoch,
    maxRevision,
    ...content,
    staleCursor: isStaleCursor(input, epoch),
    ...planBeforePage(database, input, content),
  };
}
