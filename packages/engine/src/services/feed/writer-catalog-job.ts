import type { Database } from '@repo/db';
import { populateAgentCatalogSearchRows } from './writer-catalog-search';
import { replaceAgentCatalogRows } from './writer-agent-catalog';
import {
  completeCatalogSyncRequests,
  failCatalogSyncRequests,
  insertCatalogSyncRequest,
  joinCatalogSyncRequests,
  readCatalogJobRequestIds,
  type CatalogSqlJob,
  type CatalogSqlCommit,
} from './writer-catalog-sync';

type CatalogTransaction = Pick<Database, 'select' | 'insert' | 'update'>;

export function applyCatalogSqlJob(
  transaction: CatalogTransaction,
  job: CatalogSqlJob,
): CatalogSqlCommit {
  const requestIds = readCatalogJobRequestIds(transaction, job);
  const changedIds = applyCatalogSqlMutation(transaction, job);
  return {
    kind: job.type,
    requestIds,
    changedIds,
    requestedIds: job.type === 'catalogSyncRequest' ? [job.requestId] : [],
  };
}

function applyCatalogSqlMutation(
  transaction: CatalogTransaction,
  job: CatalogSqlJob,
): string[] {
  if (job.type === 'agentCatalogReplace') {
    const changedIds = replaceAgentCatalogRows(transaction, job);
    completeCatalogSyncRequests(transaction, job);
    return changedIds;
  }
  applyCatalogRequestMutation(transaction, job);
  return [];
}

function applyCatalogRequestMutation(
  transaction: CatalogTransaction,
  job: Exclude<CatalogSqlJob, { type: 'agentCatalogReplace' }>,
): void {
  switch (job.type) {
    case 'catalogSyncRequest':
      insertCatalogSyncRequest(transaction, job);
      return;
    case 'catalogSyncJoin':
      joinCatalogSyncRequests(transaction, job);
      return;
    case 'catalogSyncFailure':
      failCatalogSyncRequests(transaction, job);
      return;
    case 'agentCatalogSearchProjection':
      populateAgentCatalogSearchRows(transaction, job);
  }
}
