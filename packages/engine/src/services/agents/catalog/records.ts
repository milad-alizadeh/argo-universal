import { randomUUID } from 'node:crypto';
import {
  AgentRecord,
  type ACPAgent,
  type ACPAgentRegistry,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { createRegistryReader } from './registry';

export function createCatalogAgentRecord(
  agent: ACPAgent,
  syncedAt: number,
): AgentRecord {
  return {
    id: createInitialLocalAgentId(agent.id),
    registryId: agent.id,
    registryMetadata: JSON.stringify(agent),
    catalogPresent: true,
    catalogSyncedAt: syncedAt,
  };
}

function createInitialLocalAgentId(registryId: string): string {
  const legacyRegistryIds = new Set(['claude-acp', 'codex-acp']);
  return legacyRegistryIds.has(registryId)
    ? registryId.replace(/-acp$/u, '')
    : randomUUID();
}

type CatalogTransaction = Pick<Database, 'select' | 'update' | 'insert'>;

export function commitCatalogAgents(
  database: Database,
  registry: ACPAgentRegistry,
): string[] {
  return database.transaction((transaction) =>
    replaceCatalogOwnedFields(transaction, registry, Date.now()),
  );
}

function replaceCatalogOwnedFields(
  database: CatalogTransaction,
  registry: ACPAgentRegistry,
  syncedAt: number,
): string[] {
  const previousIds = readPresentCatalogAgentIds(database);
  markCatalogAgentsRemoved(database, syncedAt);
  for (const agent of registry.agents)
    upsertCatalogAgent(database, agent, syncedAt);
  return [
    ...new Set([...previousIds, ...readPresentCatalogAgentIds(database)]),
  ];
}

function readPresentCatalogAgentIds(
  database: Pick<Database, 'select'>,
): string[] {
  return database
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogPresent, true))
    .all()
    .map(({ id }) => id);
}

function markCatalogAgentsRemoved(
  database: Pick<Database, 'update'>,
  syncedAt: number,
): void {
  database
    .update(agents)
    .set({ catalogPresent: false, catalogSyncedAt: syncedAt })
    .where(eq(agents.catalogPresent, true))
    .run();
}

function upsertCatalogAgent(
  database: Pick<Database, 'insert'>,
  agent: ACPAgent,
  syncedAt: number,
): void {
  const record = createCatalogAgentRecord(agent, syncedAt);
  database
    .insert(agents)
    .values(record)
    .onConflictDoUpdate({
      target: agents.registryId,
      set: createCatalogOwnedFields(agent, syncedAt),
    })
    .run();
}

export function serializeLegacyCatalogAgentRows(
  payload: unknown,
  fetchedAt: unknown,
): string {
  const reader = createRegistryReader();
  try {
    const syncedAt = readLegacyCatalogTimestamp(fetchedAt, reader);
    const registry = reader.parse(payload);
    return JSON.stringify(
      registry.agents.map((agent) => createCatalogAgentRecord(agent, syncedAt)),
    );
  } catch {
    return '[]';
  }
}

export function readCatalogAgentRecords(
  database: Database,
  reader: ReturnType<typeof createRegistryReader>,
): { record: AgentRecord; agent: ACPAgent }[] {
  return database
    .select()
    .from(agents)
    .all()
    .filter(isCatalogAgentRecord)
    .map((row) => hydrateCatalogAgentRecord(row, reader));
}

function hydrateCatalogAgentRecord(
  row: AgentRecord,
  reader: ReturnType<typeof createRegistryReader>,
): { record: AgentRecord; agent: ACPAgent } {
  const parsed = AgentRecord.safeParse(row);
  if (!parsed.success)
    return reader.reject('Stored Agent row is malformed', parsed.error);
  const record = parsed.data;
  const agent = reader.parseAgent(record.registryMetadata);
  if (agent.id !== record.registryId)
    reader.reject('Stored Agent registry identity does not match metadata');
  return { record, agent };
}

function readLegacyCatalogTimestamp(
  fetchedAt: unknown,
  reader: ReturnType<typeof createRegistryReader>,
): number {
  if (typeof fetchedAt !== 'number')
    return reader.reject('Legacy registry timestamp is malformed');
  if (!Number.isSafeInteger(fetchedAt))
    return reader.reject('Legacy registry timestamp is malformed');
  return fetchedAt;
}

function createCatalogOwnedFields(
  agent: ACPAgent,
  syncedAt: number,
): Omit<AgentRecord, 'id'> {
  return {
    registryId: agent.id,
    registryMetadata: JSON.stringify(agent),
    catalogPresent: true,
    catalogSyncedAt: syncedAt,
  };
}

function isCatalogAgentRecord(row: AgentRecord): boolean {
  return (
    row.registryId !== null ||
    row.registryMetadata !== null ||
    row.catalogPresent
  );
}
