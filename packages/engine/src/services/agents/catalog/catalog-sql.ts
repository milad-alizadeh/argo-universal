import { AgentCatalogSyncRequestRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentCatalogSyncRequest, agents } from '@repo/db/schema';
import { desc, eq, max, sql } from 'drizzle-orm';
import type { RegistryReader } from './registry-reader';

type CatalogSqlReadInput = { database: Database; reader: RegistryReader };

export function readCatalogSyncRequest(
  input: CatalogSqlReadInput,
  requestId: string,
): AgentCatalogSyncRequestRecord | undefined {
  return hydrateCatalogSyncRequest(
    input.reader,
    input.database
      .select()
      .from(agentCatalogSyncRequest)
      .where(eq(agentCatalogSyncRequest.requestId, requestId))
      .get(),
  );
}

export function readCatalogSqlState(input: CatalogSqlReadInput): {
  fetchedAt: number | null;
  error: string | null;
  rejectedValues: number;
} {
  const latest = readLatestCatalogRequest(input);
  return {
    fetchedAt: readLastAcceptedCatalogTime(input.database),
    error: latest?.error ?? null,
    rejectedValues: readCatalogRejectionCount(input.database),
  };
}

function readLatestCatalogRequest(
  input: CatalogSqlReadInput,
): AgentCatalogSyncRequestRecord | undefined {
  const row = input.database
    .select()
    .from(agentCatalogSyncRequest)
    .orderBy(desc(agentCatalogSyncRequest.sequence))
    .get();
  return hydrateCatalogSyncRequest(input.reader, row);
}

function readLastAcceptedCatalogTime(database: Database): number | null {
  const saved = database
    .select({ at: max(agents.catalogSyncedAt) })
    .from(agents);
  return (
    database
      .select({
        at: sql<
          number | null
        >`coalesce(${max(agentCatalogSyncRequest.fetchedAt)}, (${saved}))`,
      })
      .from(agentCatalogSyncRequest)
      .get()?.at ?? null
  );
}

export function readLatestCatalogChangeIds(database: Database): string[] {
  const latest = database
    .select({ at: max(agents.catalogSyncedAt) })
    .from(agents);
  return database
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogSyncedAt, latest))
    .all()
    .map(({ id }) => id);
}

export function readCatalogRequestChangeIds(
  database: Database,
  row: AgentCatalogSyncRequestRecord,
): string[] {
  if (row.status !== 'succeeded' || row.fetchedAt === null) return [];
  return database
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogSyncedAt, row.fetchedAt))
    .all()
    .map(({ id }) => id);
}

export function readCatalogRejectionCount(database: Database): number {
  return (
    database
      .select({ rejectedValues: max(agentCatalogSyncRequest.rejectedValues) })
      .from(agentCatalogSyncRequest)
      .get()?.rejectedValues ?? 0
  );
}

function hydrateCatalogSyncRequest(
  reader: RegistryReader,
  row: typeof agentCatalogSyncRequest.$inferSelect | undefined,
): AgentCatalogSyncRequestRecord | undefined {
  if (!row) return undefined;
  const result = AgentCatalogSyncRequestRecord.safeParse(row);
  if (!result.success)
    return reader.reject('Stored catalog request is malformed', result.error);
  return result.data;
}
