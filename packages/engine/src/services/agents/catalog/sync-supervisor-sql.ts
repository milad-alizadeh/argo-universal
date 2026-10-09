import type { Database } from '@repo/db';
import { agentCatalogSyncRequest } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  fromPromise,
  type ActorRefFrom,
  type DoneActorEvent,
  type ErrorActorEvent,
} from 'xstate';
import {
  writeDatabaseJobAndWaitForCommit,
  type writerMachine,
} from '../../feed';
import { readCatalogRejectionCount } from './catalog-sql';
import type { FetchAgents } from './fetch-agents';
import { prepareSavedCatalogSearchProjection } from './records';
import type { RegistryReader } from './registry-reader';

export interface SyncSupervisorInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
  fetchAgents: FetchAgents;
  reader: RegistryReader;
  now(): number;
}
export interface SyncSupervisorContext extends SyncSupervisorInput {
  syncId: string;
  joinRequestIds: string[];
  joinBatchSize: number;
  abandonedSyncIds: string[];
}
type WorkerResult = {
  changedIds: string[];
  error: string | null;
  abandoned: boolean;
};
export type SyncSupervisorEvent =
  | { type: 'catalog.requested'; requestId: string }
  | { type: 'catalog.shutdown' }
  | DoneActorEvent<WorkerResult, 'catalogWorker'>
  | DoneActorEvent<void, 'catalogJoins'>
  | ErrorActorEvent<unknown, 'catalogJoins'>;

export type InterruptInput = SyncSupervisorInput & {
  syncIds: string[] | null;
  waitingRequestIds: string[];
  finalShutdownAttempt?: true;
};
export type JoinInput = SyncSupervisorInput & {
  requestIds: string[];
  syncId: string;
};

export function readPendingSyncIds(database: Database): string[] {
  return [
    ...new Set(
      database
        .select({ syncId: agentCatalogSyncRequest.syncId })
        .from(agentCatalogSyncRequest)
        .where(eq(agentCatalogSyncRequest.status, 'pending'))
        .all()
        .map(({ syncId }) => syncId),
    ),
  ];
}

export async function interruptCatalogRequests(
  input: InterruptInput,
): Promise<void> {
  await writeDatabaseJobAndWaitForCommit(input.writer, {
    type: 'catalogSyncFailure',
    status: 'interrupted',
    syncIds: input.syncIds,
    error: 'Registry sync was interrupted',
    completedAt: input.now(),
    rejectedValues: readCatalogRejectionCount(input.database),
    waitingRequestIds: input.waitingRequestIds,
    finalShutdownAttempt: input.finalShutdownAttempt,
  });
}

export async function recoverCatalogRequests(
  input: InterruptInput,
): Promise<void> {
  const projection = prepareSavedCatalogSearchProjection(
    input.database,
    input.reader,
  );
  if (projection.rows.length)
    await writeDatabaseJobAndWaitForCommit(input.writer, projection);
  await interruptCatalogRequests(input);
}

export async function joinCatalogRequests(input: JoinInput): Promise<void> {
  await writeDatabaseJobAndWaitForCommit(input.writer, {
    type: 'catalogSyncJoin',
    requestIds: input.requestIds,
    syncId: input.syncId,
  });
}

export const catalogSqlActors = {
  recoverCatalogSql: fromPromise<void, InterruptInput>(async ({ input }) =>
    recoverCatalogRequests(input),
  ),
  joinRequests: fromPromise<void, JoinInput>(async ({ input }) =>
    joinCatalogRequests(input),
  ),
  interruptRequests: fromPromise<void, InterruptInput>(async ({ input }) =>
    interruptCatalogRequests(input),
  ),
};
