import { fromPromise } from 'xstate';
import type { AgentCatalogReplaceJob } from '../../feed';
import { RegistryHttpError, type FetchAgents } from './fetch-agents';
import { prepareAgentCatalogRows } from './records';
import type { RegistryReader } from './registry-reader';

export interface CatalogSyncInput {
  fetchAgents: FetchAgents;
  reader: RegistryReader;
  now(): number;
  source: string;
  scope: string;
  rejectedValues: number;
}
export type CatalogSyncResult =
  | { job: AgentCatalogReplaceJob }
  | { error: string; rejectedValues: number; retryable: boolean };

function catalogReplacement(
  input: CatalogSyncInput,
  response: unknown,
): AgentCatalogReplaceJob {
  const registry = input.reader.parse(response);
  const syncedAt = input.now();
  return {
    type: 'agentCatalogReplace',
    source: input.source,
    scope: input.scope,
    rows: prepareAgentCatalogRows(registry, syncedAt),
    syncedAt,
    rejectedValues: input.rejectedValues,
  };
}
function isTransient(error: unknown): boolean {
  if (!(error instanceof RegistryHttpError)) return true;
  return error.retryable;
}
function catalogFailure(
  input: CatalogSyncInput,
  before: number,
  error: unknown,
): CatalogSyncResult {
  const rejectedValues = input.reader.count() - before;
  return {
    error: error instanceof Error ? error.message : String(error),
    rejectedValues: input.rejectedValues + rejectedValues,
    retryable: rejectedValues === 0 && isTransient(error),
  };
}
export const catalogSyncActor = fromPromise<
  CatalogSyncResult,
  CatalogSyncInput
>(async ({ input, signal }) => {
  const before = input.reader.count();
  try {
    const response = await input.fetchAgents(signal);
    signal.throwIfAborted();
    return { job: catalogReplacement(input, response) };
  } catch (error) {
    signal.throwIfAborted();
    return catalogFailure(input, before, error);
  }
});
