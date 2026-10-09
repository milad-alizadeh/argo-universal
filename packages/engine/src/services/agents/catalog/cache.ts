import {
  type ACPAgentRegistry,
  type AgentsCatalogOutput,
  AgentCatalogCacheRecord,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentCatalogCache } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { createRegistryReader, RegistryPort } from './registry';

export interface RegistrySnapshot {
  registry: ACPAgentRegistry | null;
  fetchedAt: AgentsCatalogOutput['fetchedAt'];
  error: string | null;
}

export interface RegistryStorage {
  database: Database;
  reader: ReturnType<typeof createRegistryReader>;
  port: RegistryPort;
}

export async function readRegistryCache(
  storage: RegistryStorage,
): Promise<RegistrySnapshot> {
  try {
    const row = storage.database
      .select()
      .from(agentCatalogCache)
      .where(eq(agentCatalogCache.id, 1))
      .get();
    return row ? hydrateCache(row, storage.reader) : emptyCache(null);
  } catch (error) {
    return emptyCache(errorMessage(error));
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function emptyCache(error: string | null): RegistrySnapshot {
  return { registry: null, fetchedAt: null, error };
}

function hydrateCache(
  row: unknown,
  reader: ReturnType<typeof createRegistryReader>,
): RegistrySnapshot {
  const accepted = AgentCatalogCacheRecord.safeParse(row);
  if (!accepted.success)
    reader.reject('Registry cache row is malformed', accepted.error);
  const { payload, fetchedAt } = accepted.data;
  return { registry: reader.parse(payload), fetchedAt, error: null };
}

export async function refreshRegistry(
  storage: RegistryStorage,
  signal: AbortSignal,
): Promise<RegistrySnapshot> {
  const registry = storage.reader.parse(
    await storage.port.readRegistry(signal),
  );
  signal.throwIfAborted();
  const fetchedAt = Date.now();
  replaceCache(storage.database, registry, fetchedAt);
  return { registry, fetchedAt, error: null };
}

function replaceCache(
  database: Database,
  registry: ACPAgentRegistry,
  fetchedAt: number,
): void {
  const values = { id: 1, payload: JSON.stringify(registry), fetchedAt };
  database.transaction((transaction): void => {
    transaction
      .insert(agentCatalogCache)
      .values(values)
      .onConflictDoUpdate({ target: agentCatalogCache.id, set: values })
      .run();
  });
}
