import type { Database } from '@repo/db';
import { syncJobs } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  replaceAgentCatalogRows,
  type AgentCatalogReplaceJob,
} from './writer-agent-catalog';
import {
  saveAgentConfiguration,
  type AgentConfigurationJob,
} from './writer-agent-configuration';

export type SyncJobWrite = {
  type: 'syncJobUpdate';
  source: string;
  scope: string;
  set: Pick<typeof syncJobs.$inferInsert, 'status'> &
    Partial<Omit<typeof syncJobs.$inferInsert, 'source' | 'scope'>>;
};
export type CatalogSqlJob =
  | SyncJobWrite
  | AgentCatalogReplaceJob
  | AgentConfigurationJob;
const catalogSqlJobTypes = new Set<string>([
  'syncJobUpdate',
  'agentCatalogReplace',
  'agentConfigurationSave',
]);
export function isCatalogSqlJob(job: { type: string }): job is CatalogSqlJob {
  return catalogSqlJobTypes.has(job.type);
}
export function updateSyncJob(
  database: Pick<Database, 'insert' | 'update'>,
  job: SyncJobWrite,
): void {
  database
    .insert(syncJobs)
    .values({
      source: job.source,
      scope: job.scope,
      requestedAt: 0,
      ...job.set,
    })
    .onConflictDoUpdate({
      target: [syncJobs.source, syncJobs.scope],
      set: job.set,
    })
    .run();
}
export function completeSyncJob(
  database: Pick<Database, 'update'>,
  job: AgentCatalogReplaceJob,
): void {
  database
    .update(syncJobs)
    .set({
      status: 'idle',
      completedAt: job.syncedAt,
      fetchedAt: job.syncedAt,
      error: null,
      rejectedValues: job.rejectedValues,
    })
    .where(and(eq(syncJobs.source, job.source), eq(syncJobs.scope, job.scope)))
    .run();
}

export function applyCatalogSqlJob(
  transaction: Pick<Database, 'select' | 'insert' | 'update'>,
  job: CatalogSqlJob,
): void {
  if (job.type === 'syncJobUpdate') return updateSyncJob(transaction, job);
  if (job.type === 'agentConfigurationSave')
    return saveAgentConfiguration(transaction, job);
  replaceAgentCatalogRows(transaction, job);
  completeSyncJob(transaction, job);
}
