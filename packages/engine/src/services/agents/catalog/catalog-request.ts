import type { AgentsCatalogSyncOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import { writeDatabaseJobAndWaitForCommit, type writerMachine } from '../../feed';
import { readCatalogSyncRequest } from './catalog-sql';
import type { RegistryReader } from './registry-reader';

interface CatalogRequestInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
  reader: RegistryReader;
  requestId: string;
  signal?: AbortSignal;
}

export async function requestAgentCatalogSync(
  input: CatalogRequestInput,
): Promise<AgentsCatalogSyncOutput> {
  input.signal?.throwIfAborted();
  const completion = observeCatalogRequestCompletion(input);
  try {
    const admitted = writeDatabaseJobAndWaitForCommit(input.writer, {
      type: 'catalogSyncRequest', requestId: input.requestId, requestedAt: Date.now(),
    });
    const [, result] = await Promise.all([admitted, completion.promise]);
    return result;
  } finally {
    completion.unsubscribe();
  }
}

function observeCatalogRequestCompletion(input: CatalogRequestInput): {
  promise: Promise<AgentsCatalogSyncOutput>;
  unsubscribe(): void;
} {
  const outcome = Promise.withResolvers<AgentsCatalogSyncOutput>();
  const readCommittedOutcome = (): void => settleCatalogSqlOutcome(input, outcome);
  const committed = input.writer.on('catalog.sqlCommitted', readCommittedOutcome);
  const failed = input.writer.on('catalog.writeFailed', (notice) => {
    if (notice.requestIds.includes(input.requestId)) outcome.reject(notice.error);
  });
  return { promise: outcome.promise,
    unsubscribe: () => { committed.unsubscribe(); failed.unsubscribe();
 } };
}

function settleCatalogSqlOutcome(
  input: CatalogRequestInput,
  outcome: Pick<PromiseWithResolvers<AgentsCatalogSyncOutput>, 'resolve' | 'reject'>,
): void {
  try {
    const row = readCatalogSyncRequest(input, input.requestId);
    if (!row || row.status === 'pending') return;
    const changedIds = row.status === 'succeeded' ? input.database.select({ id: agents.id })
      .from(agents).where(eq(agents.catalogSyncedAt, row.fetchedAt ?? 0)).all().map(({ id }) => id) : [];
    outcome.resolve({ changedIds, error: row.error, rejectedValues: row.rejectedValues });
  } catch (error) { outcome.reject(error); }
}
