import { RegistryCacheRecord } from '@repo/contracts';
import type {
  ACPAgentRegistry,
  BinaryTarget,
  AgentsRegistryOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { registryCache } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import { resolveRegistryServerPlatform } from '../records';
import { createRegistryReader } from './registry-reader';

export const readRegistryCache = (
  database: Database,
): ACPAgentRegistry | null => {
  const row = database
    .select()
    .from(registryCache)
    .where(eq(registryCache.id, 1))
    .get();

  try {
    return row ? hydrateCache(row) : null;
  } catch {
    // The validated cache is disposable; rejection is logged by its reader.
    return null;
  }
};

export const registrySupport = (
  entry: ACPAgentRegistry['agents'][number],
): AgentsRegistryOutput['agents'][number]['support'] => {
  if (binaryTarget(entry)) return 'binary';

  return entry.distribution.npx ? 'npx' : 'unavailable';
};

export const readRegistry = (
  database: Database,
  error: string | null,
): AgentsRegistryOutput => {
  const cached = readRegistryCache(database);
  const entries = cachedAgents(cached);

  return {
    agents: entries.map((entry) => ({
      entry,
      support: registrySupport(entry),
    })),
    error: entries.length > 0 ? null : cacheError(cached, error),
  };
};

export class RegistryCacheReplaceJob implements WriterJob {
  public constructor(
    private readonly registry: ACPAgentRegistry,
    private readonly fetchedAt: number,
  ) {}
  public describe(): string {
    return 'replace ACP Registry cache';
  }
  public commit(transaction: StorageTransaction): void {
    const row = {
      id: 1,
      json: JSON.stringify(this.registry),
      fetchedAt: this.fetchedAt,
    };

    transaction
      .insert(registryCache)
      .values(row)
      .onConflictDoUpdate({ target: registryCache.id, set: row })
      .run();
  }
}

const binaryTarget = (
  entry: ACPAgentRegistry['agents'][number],
): BinaryTarget | undefined =>
  entry.distribution.binary?.[resolveRegistryServerPlatform()];

const cachedAgents = (
  cached: ACPAgentRegistry | null,
): ACPAgentRegistry['agents'] => cached?.agents ?? [];

const hydrateCache = (
  row: typeof registryCache.$inferSelect,
): ACPAgentRegistry | null => {
  const reader = createRegistryReader();
  const parsed = RegistryCacheRecord.safeParse(row);

  if (!parsed.success)
    return reader.reject(
      'Stored Registry cache row is malformed',
      parsed.error,
    );

  return parsed.data.json ? reader.parse(parsed.data.json) : null;
};

const cacheError = (
  cached: ACPAgentRegistry | null,
  error: string | null,
): string | null => error ?? (cached ? null : 'Registry cache is unavailable');
