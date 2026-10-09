import type { Database } from '@repo/db';
import { agentCatalogSyncRequest } from '@repo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { AgentCatalogReplaceJob } from './writer-agent-catalog';
import type { AgentCatalogSearchProjectionJob } from './writer-catalog-search';

export type CatalogSyncRequestJob = {
  type: 'catalogSyncRequest';
  requestId: string;
  requestedAt: number;
};
export type CatalogSyncJoinJob = {
  type: 'catalogSyncJoin';
  requestIds: readonly string[];
  syncId: string;
};
export type CatalogSyncFailureJob = {
  type: 'catalogSyncFailure';
  syncIds: readonly string[] | null;
  status: 'failed' | 'interrupted';
  error: string;
  rejectedValues: number;
  completedAt: number;
  waitingRequestIds?: readonly string[];
  finalShutdownAttempt?: true;
};
export type CatalogSqlJob =
  | CatalogSyncRequestJob
  | CatalogSyncJoinJob
  | CatalogSyncFailureJob
  | AgentCatalogReplaceJob
  | AgentCatalogSearchProjectionJob;
export type CatalogSqlCommit = {
  kind: CatalogSqlJob['type'];
  requestedIds: string[];
  requestIds: string[];
  changedIds: string[];
};
type CatalogTransaction = Pick<Database, 'select' | 'insert' | 'update'>;

export function isCatalogSqlJob(job: { type: string }): job is CatalogSqlJob {
  return (
    job.type === 'catalogSyncRequest' ||
    job.type === 'catalogSyncJoin' ||
    job.type === 'catalogSyncFailure' ||
    job.type === 'agentCatalogReplace' ||
    job.type === 'agentCatalogSearchProjection'
  );
}

export function insertCatalogSyncRequest(
  transaction: Pick<Database, 'insert'>,
  job: CatalogSyncRequestJob,
): void {
  transaction
    .insert(agentCatalogSyncRequest)
    .values({
      requestId: job.requestId,
      syncId: job.requestId,
      status: 'pending',
      requestedAt: job.requestedAt,
    })
    .run();
}

export function joinCatalogSyncRequests(
  transaction: CatalogTransaction,
  job: CatalogSyncJoinJob,
): void {
  const source = transaction
    .select()
    .from(agentCatalogSyncRequest)
    .where(eq(agentCatalogSyncRequest.requestId, job.syncId))
    .get();
  if (!source) throw new Error('Catalog sync request is missing');
  transaction
    .update(agentCatalogSyncRequest)
    .set({
      syncId: job.syncId,
      status: source.status,
      completedAt: source.completedAt,
      fetchedAt: source.fetchedAt,
      error: source.error,
      rejectedValues: source.rejectedValues,
    })
    .where(
      and(
        inArray(agentCatalogSyncRequest.requestId, [...job.requestIds]),
        eq(agentCatalogSyncRequest.status, 'pending'),
      ),
    )
    .run();
}

export function completeCatalogSyncRequests(
  transaction: Pick<Database, 'update'>,
  job: AgentCatalogReplaceJob,
): void {
  transaction
    .update(agentCatalogSyncRequest)
    .set({
      status: 'succeeded',
      completedAt: job.syncedAt,
      fetchedAt: job.syncedAt,
      error: null,
      rejectedValues: job.rejectedValues,
    })
    .where(
      and(
        eq(agentCatalogSyncRequest.syncId, job.syncId),
        eq(agentCatalogSyncRequest.status, 'pending'),
      ),
    )
    .run();
}

export function failCatalogSyncRequests(
  transaction: Pick<Database, 'update'>,
  job: CatalogSyncFailureJob,
): void {
  transaction
    .update(agentCatalogSyncRequest)
    .set({
      status: job.status,
      completedAt: job.completedAt,
      error: job.error,
      rejectedValues: job.rejectedValues,
    })
    .where(
      and(
        eq(agentCatalogSyncRequest.status, 'pending'),
        job.syncIds
          ? inArray(agentCatalogSyncRequest.syncId, [...job.syncIds])
          : undefined,
      ),
    )
    .run();
}

export function readCatalogJobRequestIds(
  database: Pick<Database, 'select'>,
  job: CatalogSqlJob,
): string[] {
  if (job.type === 'agentCatalogSearchProjection') return [];
  if (job.type === 'catalogSyncRequest') return [job.requestId];
  if (job.type === 'catalogSyncJoin') return [...job.requestIds];
  const syncIds =
    job.type === 'agentCatalogReplace' ? [job.syncId] : job.syncIds;
  const rows = database
    .select({ requestId: agentCatalogSyncRequest.requestId })
    .from(agentCatalogSyncRequest)
    .where(
      syncIds
        ? inArray(agentCatalogSyncRequest.syncId, [...syncIds])
        : undefined,
    )
    .all();
  return [
    ...rows.map(({ requestId }) => requestId),
    ...('waitingRequestIds' in job ? (job.waitingRequestIds ?? []) : []),
  ];
}
