import type { AgentsCatalogSyncOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import {
  writeDatabaseJobAndWaitForCommit,
  type writerMachine,
} from '../../feed';
import { readCatalogSyncRequest } from './catalog-sql';
import type { RegistryReader } from './registry-reader';

interface CatalogRequestInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
  reader: RegistryReader;
  requestId: string;
  admissionSignal?: AbortSignal;
  signal?: AbortSignal;
}

export async function requestAgentCatalogSync(
  input: CatalogRequestInput,
): Promise<AgentsCatalogSyncOutput> {
  input.signal?.throwIfAborted();
  input.admissionSignal?.throwIfAborted();
  const completion = observeCatalogRequestCompletion(input);
  try {
    const admitted = admitCatalogRequest(input);
    const [, result] = await Promise.all([admitted, completion.promise]);
    return result;
  } finally {
    completion.unsubscribe();
  }
}

function admitCatalogRequest(input: CatalogRequestInput): Promise<void> {
  return writeDatabaseJobAndWaitForCommit(input.writer, {
    type: 'catalogSyncRequest',
    requestId: input.requestId,
    requestedAt: Date.now(),
  });
}

type CatalogOutcome = PromiseWithResolvers<AgentsCatalogSyncOutput>;
function observeCatalogRequestCompletion(input: CatalogRequestInput): {
  promise: Promise<AgentsCatalogSyncOutput>;
  unsubscribe(): void;
} {
  const outcome = Promise.withResolvers<AgentsCatalogSyncOutput>();
  const stopObservingAbort = observeCatalogCallerAbort(input.signal, outcome);
  const stopObservingWriter = observeCatalogWriterOutcome(input, outcome);
  return {
    promise: outcome.promise,
    unsubscribe: () => {
      stopObservingWriter();
      stopObservingAbort();
    },
  };
}

function observeCatalogCallerAbort(
  signal: AbortSignal | undefined,
  outcome: CatalogOutcome,
): () => void {
  const abort = (): void => outcome.reject(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  return () => signal?.removeEventListener('abort', abort);
}

function settleCatalogSqlOutcome(
  input: CatalogRequestInput,
  outcome: CatalogOutcome,
): void {
  try {
    const result = readCompletedCatalogRequest(input);
    if (result) outcome.resolve(result);
  } catch (error) {
    outcome.reject(error);
  }
}

function readCompletedCatalogRequest(
  input: CatalogRequestInput,
): AgentsCatalogSyncOutput | undefined {
  const row = readCatalogSyncRequest(input, input.requestId);
  if (!row || row.status === 'pending') return undefined;
  return {
    changedIds: row.changedIds,
    error: row.error,
    rejectedValues: row.rejectedValues,
  };
}

function observeCatalogWriterOutcome(
  input: CatalogRequestInput,
  outcome: CatalogOutcome,
): () => void {
  const { writer, requestId } = input;
  const readOutcome = (): void => settleCatalogSqlOutcome(input, outcome);
  const committed = writer.on('catalog.sqlCommitted', readOutcome);
  const failed = writer.on('catalog.writeFailed', (notice) => {
    if (notice.requestIds.includes(requestId)) outcome.reject(notice.error);
  });
  return () => {
    committed.unsubscribe();
    failed.unsubscribe();
  };
}
