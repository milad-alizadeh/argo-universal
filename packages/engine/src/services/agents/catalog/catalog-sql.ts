import { AgentCatalogSyncRequestRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentCatalogSyncRequest, agents } from '@repo/db/schema';
import { desc, eq, inArray, max } from 'drizzle-orm';
import type { RegistryReader } from './registry-reader';

export type CatalogSqlReadInput = {
  database: Database;
  reader: RegistryReader;
};

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

type CatalogSqlState = {
  fetchedAt: number | null;
  error: string | null;
  rejectedValues: number;
};
export function readCatalogSqlState(
  input: CatalogSqlReadInput,
): CatalogSqlState {
  const latest = readLatestCatalogOutcome(input, [
    'succeeded',
    'failed',
    'interrupted',
  ]);
  return {
    fetchedAt: readLastAcceptedCatalogTime(input),
    error: latest?.error ?? null,
    rejectedValues: readCatalogRejectionCount(input.database),
  };
}

function readLatestCatalogOutcome(
  input: CatalogSqlReadInput,
  statuses: AgentCatalogSyncRequestRecord['status'][],
): AgentCatalogSyncRequestRecord | undefined {
  const row = input.database
    .select()
    .from(agentCatalogSyncRequest)
    .where(inArray(agentCatalogSyncRequest.status, statuses))
    .orderBy(desc(agentCatalogSyncRequest.sequence))
    .get();
  return hydrateCatalogSyncRequest(input.reader, row);
}

function readLastAcceptedCatalogTime(
  input: CatalogSqlReadInput,
): number | null {
  const accepted = readLatestCatalogOutcome(input, ['succeeded']);
  if (accepted) return accepted.fetchedAt;
  const saved = input.database
    .select({ at: max(agents.catalogSyncedAt) })
    .from(agents)
    .get() ?? { at: null };
  return saved.at;
}

export function readLatestCatalogChangeIds(
  input: CatalogSqlReadInput,
): string[] {
  const accepted = readLatestCatalogOutcome(input, ['succeeded']);
  if (accepted) return accepted.changedIds;
  return input.database
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogPresent, true))
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
