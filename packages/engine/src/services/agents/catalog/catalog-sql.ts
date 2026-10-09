import { AgentCatalogSyncRequestRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentCatalogSyncRequest, agents } from '@repo/db/schema';
import { desc, eq, max } from 'drizzle-orm';
import type { RegistryReader } from './registry-reader';

type CatalogSqlReadInput = { database: Database; reader: RegistryReader };

export function readCatalogSyncRequest(
  input: CatalogSqlReadInput,
  requestId: string,
): AgentCatalogSyncRequestRecord | undefined {
  return hydrateCatalogSyncRequest(input.reader, input.database.select()
    .from(agentCatalogSyncRequest).where(eq(agentCatalogSyncRequest.requestId, requestId)).get());
}

export function readCatalogSqlState(input: CatalogSqlReadInput): {
  fetchedAt: number | null; error: string | null; rejectedValues: number;
} {
  const latest = hydrateCatalogSyncRequest(input.reader, input.database.select()
    .from(agentCatalogSyncRequest).orderBy(desc(agentCatalogSyncRequest.sequence)).get());
  const accepted = input.database.select({ fetchedAt: max(agentCatalogSyncRequest.fetchedAt) })
    .from(agentCatalogSyncRequest).get();
  const saved = input.database.select({ fetchedAt: max(agents.catalogSyncedAt) }).from(agents).get();
  return { fetchedAt: accepted?.fetchedAt ?? saved?.fetchedAt ?? null, error: latest?.error ?? null,
    rejectedValues: readCatalogRejectionCount(input.database) };
}

export function readCatalogRejectionCount(database: Database): number {
  return database.select({ rejectedValues: max(agentCatalogSyncRequest.rejectedValues) })
    .from(agentCatalogSyncRequest).get()?.rejectedValues ?? 0;
}

function hydrateCatalogSyncRequest(
  reader: RegistryReader,
  row: typeof agentCatalogSyncRequest.$inferSelect | undefined,
): AgentCatalogSyncRequestRecord | undefined {
  if (!row) return undefined;
  const result = AgentCatalogSyncRequestRecord.safeParse(row);
  if (!result.success) return reader.reject('Stored catalog request is malformed', result.error);
  return result.data;
}
