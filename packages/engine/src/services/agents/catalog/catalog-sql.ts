import {
  SyncJobRecord,
  type AgentsCatalogInput,
  type AgentsCatalogOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { syncJobs, agents } from '@repo/db/schema';
import { and, eq, max, isNotNull } from 'drizzle-orm';
import {
  readCatalogAgentRecords,
  resolveRegistryServerPlatform,
} from './records';
import { createRegistryReader, type RegistryReader } from './registry-reader';

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
function readCatalogSqlState(
  input: CatalogSqlReadInput,
): Omit<AgentsCatalogOutput, 'agents'> {
  const job = readCatalogSyncJob(input) ?? emptyJob;
  const fetchedAt = job.fetchedAt ?? lastSavedCatalogTime(input.database);
  return {
    fetchedAt,
    serverPlatform: resolveRegistryServerPlatform(),
    status: deriveCatalogStatus(fetchedAt, job.error),
    error: job.error,
    rejectedValues: job.rejectedValues + input.reader.count(),
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

function deriveCatalogStatus(
  fetchedAt: number | null,
  error: string | null,
): AgentsCatalogOutput['status'] {
  if (fetchedAt === null) return 'unavailable';
  return error ? 'stale' : 'fresh';
}

export function readAgentCatalog(
  database: Database,
  request: AgentsCatalogInput,
): AgentsCatalogOutput {
  const reader = createRegistryReader();
  try {
    const entries = readCatalogAgentRecords(database, reader, request);
    return {
      agents: entries,
      ...readCatalogSqlState({ database, reader }),
    };
  } catch (error) {
    return unavailableCatalog(reader, error);
  }
}

function unavailableCatalog(
  reader: RegistryReader,
  error: unknown,
): AgentsCatalogOutput {
  return {
    agents: [],
    serverPlatform: resolveRegistryServerPlatform(),
    status: 'unavailable',
    syncStatus: 'failed',
    fetchedAt: null,
    error: String(error),
    rejectedValues: reader.count(),
  };
}
