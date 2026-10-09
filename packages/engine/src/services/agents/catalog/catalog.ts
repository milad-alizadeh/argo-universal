import type {
  AgentsCatalogInput,
  AgentsCatalogOutput,
  AgentsCatalogSyncOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  createActor,
  waitFor,
  type ActorRefFrom,
  type SnapshotFrom,
} from 'xstate';
import { readAgentCatalog, resolveRegistryServerPlatform } from './browse';
import { catalogSyncSupervisorMachine } from './catalog-sync-supervisor-machine';
import { fetchAgents, type FetchAgents } from './fetch-agents';
import { createRegistryReader } from './registry-reader';

export interface StartCatalogSyncSupervisorInput {
  database: Database;
  fetchAgents?: FetchAgents;
  platform?: string;
  sessionCommandSignal?: AbortSignal;
}
export type CatalogSyncSupervisor = ActorRefFrom<
  typeof catalogSyncSupervisorMachine
>;

export function startCatalogSyncSupervisor(
  input: StartCatalogSyncSupervisorInput,
): CatalogSyncSupervisor {
  const actor = createActor(catalogSyncSupervisorMachine, {
    input: {
      database: input.database,
      fetchAgents: input.fetchAgents ?? fetchAgents,
      platform: input.platform ?? resolveRegistryServerPlatform(),
      reader: createRegistryReader(),
      now: Date.now,
    },
  }).start();
  bindCatalogShutdownSignal(actor, input.sessionCommandSignal);
  return actor;
}

export function readAgentCatalogFromSupervisor(
  actor: CatalogSyncSupervisor,
  request: AgentsCatalogInput,
): AgentsCatalogOutput {
  const { context } = actor.getSnapshot();
  return readAgentCatalog({ ...context, error: context.result.error }, request);
}

export async function syncAgentCatalog(
  actor: CatalogSyncSupervisor,
): Promise<AgentsCatalogSyncOutput> {
  const before = actor.getSnapshot();
  if (catalogSyncAdmissionIsClosed(before)) return cancelledCatalogSync(actor);
  const completed = waitFor(
    actor,
    (snapshot) =>
      snapshot.context.completedSyncs > before.context.completedSyncs ||
      snapshot.status !== 'active',
    { timeout: Infinity },
  );
  actor.send({ type: 'catalog.sync' });
  return (await completed).context.result;
}

export async function shutdownCatalogSyncSupervisor(
  actor: CatalogSyncSupervisor,
): Promise<void> {
  if (actor.getSnapshot().status !== 'active') return;
  const stopped = waitFor(actor, (snapshot) => snapshot.status !== 'active', {
    timeout: Infinity,
  });
  actor.send({ type: 'catalog.shutdown' });
  await stopped;
}

function bindCatalogShutdownSignal(
  actor: CatalogSyncSupervisor,
  signal: AbortSignal | undefined,
): void {
  if (!signal) return;
  const shutdown = (): void => actor.send({ type: 'catalog.shutdown' });
  signal.addEventListener('abort', shutdown, { once: true });
  actor.subscribe({
    complete: () => signal.removeEventListener('abort', shutdown),
  });
  if (signal.aborted) shutdown();
}

function cancelledCatalogSync(
  actor: CatalogSyncSupervisor,
): AgentsCatalogSyncOutput {
  return {
    changedIds: [],
    error: 'Registry sync was cancelled',
    rejectedValues: actor.getSnapshot().context.reader.count(),
  };
}

function catalogSyncAdmissionIsClosed(
  snapshot: SnapshotFrom<typeof catalogSyncSupervisorMachine>,
): boolean {
  return snapshot.status !== 'active' || snapshot.matches('stopping');
}
