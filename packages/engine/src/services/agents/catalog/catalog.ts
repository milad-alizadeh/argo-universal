import { EventEmitter, on } from 'node:events';
import type {
  AgentsCatalogInput,
  AgentsCatalogOutput,
  AgentsCatalogSyncOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { createActor, toPromise } from 'xstate';
import { readAgentCatalog, resolveRegistryServerPlatform } from './browse';
import { catalogSyncMachine } from './catalog-sync-machine';
import {
  createRegistryReader,
  publicRegistry,
  type RegistryPort,
} from './registry';

export interface AgentCatalogInput {
  database: Database;
  registry?: RegistryPort;
  platform?: string;
  sessionCommandSignal?: AbortSignal;
}

export function createAgentCatalog(input: AgentCatalogInput): AgentCatalog {
  return new AgentCatalog(input);
}

class AgentCatalog {
  private readonly reader = createRegistryReader();
  private readonly events = new EventEmitter<{ change: [string[]] }>();
  private error: string | null = null;
  private syncedAt: number | null = null;
  private pending: Promise<AgentsCatalogSyncOutput> | undefined;
  constructor(private readonly input: AgentCatalogInput) {}

  readCatalog(request: AgentsCatalogInput): AgentsCatalogOutput {
    return readAgentCatalog(
      {
        ...this.input,
        reader: this.reader,
        error: this.error,
        syncedAt: this.syncedAt,
        platform: this.input.platform ?? resolveRegistryServerPlatform(),
      },
      request,
    );
  }

  syncCatalog(): Promise<AgentsCatalogSyncOutput> {
    this.pending ??= this.runCatalogSync().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async runCatalogSync(): Promise<AgentsCatalogSyncOutput> {
    const result = await syncAgentCatalog(this.input, this.reader);
    this.error = result.error;
    if (result.error === null) this.publishCommittedCatalog(result.changedIds);
    return { ...result, rejectedValues: this.reader.count() };
  }

  private publishCommittedCatalog(changedIds: string[]): void {
    this.syncedAt = Date.now();
    this.events.emit('change', changedIds);
  }

  async *watchCatalogChanges(signal: AbortSignal): AsyncGenerator<string[]> {
    const stream: AsyncIterable<string[][]> = on(this.events, 'change', {
      signal,
    });
    try {
      for await (const changes of stream) yield* changes;
    } catch (error) {
      rethrowUnlessAborted(signal, error);
    }
  }
}

function syncAgentCatalog(
  input: AgentCatalogInput,
  reader: ReturnType<typeof createRegistryReader>,
): Promise<CatalogSyncResult> {
  const registry = input.registry ?? publicRegistry;
  const actor = createActor(catalogSyncMachine, {
    input: { database: input.database, reader, registry },
  });
  return runCatalogSyncActor(
    actor,
    input.sessionCommandSignal ?? new AbortController().signal,
  );
}

async function runCatalogSyncActor(
  actor: CatalogSyncActor,
  signal: AbortSignal,
): Promise<CatalogSyncResult> {
  if (signal.aborted)
    return { changedIds: [], error: 'Registry sync was cancelled' };
  const cancel = (): void => actor.send({ type: 'catalog.cancel' });
  signal.addEventListener('abort', cancel, { once: true });
  actor.start();
  try {
    return await toPromise(actor);
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

function rethrowUnlessAborted(signal: AbortSignal, error: unknown): void {
  if (!signal.aborted) throw error;
}

type CatalogSyncResult = { changedIds: string[]; error: string | null };
type CatalogSyncActor = ReturnType<
  typeof createActor<typeof catalogSyncMachine>
>;
