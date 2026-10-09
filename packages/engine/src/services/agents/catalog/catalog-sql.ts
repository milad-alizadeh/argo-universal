import { SyncJobRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { syncJobs, agents } from '@repo/db/schema';
import { and, eq, max, isNotNull } from 'drizzle-orm';
import type { RegistryReader } from './registry-reader';

export const catalogSyncKey = { source: 'agent-catalog', scope: 'default' };
export type CatalogSqlReadInput = {
  database: Database;
  reader: RegistryReader;
};
export function readCatalogSyncJob(
  input: CatalogSqlReadInput,
): SyncJobRecord | undefined {
  const row = input.database
    .select()
    .from(syncJobs)
    .where(catalogJobPredicate)
    .get();
  if (!row) return undefined;
  const result = SyncJobRecord.safeParse(row);
  if (!result.success)
    return input.reader.reject('Stored sync job is malformed', result.error);
  return result.data;
}
const catalogJobPredicate = and(
  eq(syncJobs.source, catalogSyncKey.source),
  eq(syncJobs.scope, catalogSyncKey.scope),
);
function lastSavedCatalogTime(database: Database): number | null {
  return (
    database
      .select({ at: max(agents.catalogSyncedAt) })
      .from(agents)
      .get()?.at ?? null
  );
}
const emptyJob = {
  fetchedAt: null,
  error: null,
  rejectedValues: 0,
  status: 'idle' as const,
};
export function readCatalogSqlState(input: CatalogSqlReadInput): {
  fetchedAt: number | null;
  error: string | null;
  rejectedValues: number;
  syncStatus: SyncJobRecord['status'];
} {
  const job = readCatalogSyncJob(input) ?? emptyJob;
  return {
    fetchedAt: job.fetchedAt ?? lastSavedCatalogTime(input.database),
    error: job.error,
    rejectedValues: job.rejectedValues,
    syncStatus: job.status,
  };
}
export function readLatestCatalogChangeIds(database: Database): string[] {
  return database
    .select({ id: agents.id })
    .from(agents)
    .where(isNotNull(agents.registryId))
    .all()
    .map(({ id }) => id);
}
