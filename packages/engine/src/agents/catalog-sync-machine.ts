import type { ACPAgentRegistry } from '@repo/contracts';
import type { Database } from '@repo/db';
import { fromPromise } from 'xstate';
import { AgentCatalogReplaceJob } from './agent-storage';
import { prepareAgentCatalogRows } from './records';
import { RegistryHttpError, type FetchAgents } from './registry/fetch-agents';
import { readNpxCommandNames } from './registry/npm-command';
import type { RegistryReader } from './registry/registry-reader';

export interface CatalogSyncInput {
  fetchAgents: FetchAgents;
  database: Database;
  reader: RegistryReader;
  now(): number;
  source: string;
  scope: string;
  rejectedValues: number;
}

export type CatalogSyncResult =
  | { job: AgentCatalogReplaceJob }
  | { error: string; rejectedValues: number; retryable: boolean };

async function catalogReplacement(
  input: CatalogSyncInput,
  registryText: string,
  signal: AbortSignal,
): Promise<AgentCatalogReplaceJob> {
  const registry = input.reader.parse(registryText);

  const commandNames = await readNpxCommandNames(
    { ...input, signal },
    registry.agents,
  );

  return replacementJob(input, registry, commandNames);
}

function replacementJob(
  input: CatalogSyncInput,
  registry: ACPAgentRegistry,
  commandNames: ReadonlyMap<string, string | null>,
): AgentCatalogReplaceJob {
  const syncedAt = input.now();

  return new AgentCatalogReplaceJob({
    source: input.source,
    scope: input.scope,
    rows: prepareAgentCatalogRows(registry, syncedAt, commandNames),
    syncedAt,
    rejectedValues: input.rejectedValues,
  });
}

function isTransient(cause: unknown): boolean {
  if (!(cause instanceof RegistryHttpError)) return true;

  return cause.retryable;
}

function catalogFailure(
  input: CatalogSyncInput,
  before: number,
  cause: unknown,
): CatalogSyncResult {
  const rejectedValues = input.reader.count() - before;

  return {
    error: cause instanceof Error ? cause.message : String(cause),
    rejectedValues: input.rejectedValues + rejectedValues,
    retryable: rejectedValues === 0 && isTransient(cause),
  };
}

export const catalogSyncActor = fromPromise<
  CatalogSyncResult,
  CatalogSyncInput
>(async ({ input, signal }) => {
  const before = input.reader.count();

  try {
    const registryText = await input.fetchAgents(signal);
    signal.throwIfAborted();
    const job = await catalogReplacement(input, registryText, signal);
    signal.throwIfAborted();

    return { job };
  } catch (error) {
    signal.throwIfAborted();

    return catalogFailure(input, before, error);
  }
});
