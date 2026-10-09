import { randomUUID } from 'node:crypto';
import {
  AgentRecord,
  type ACPAgent,
  type ACPAgentRegistry,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import type { AgentCatalogSearchProjectionJob, AgentCatalogWriteRow } from '../../feed';
import { and, eq, sql } from 'drizzle-orm';
import { createRegistryReader } from './registry-reader';

function createCatalogAgentRecord(
  agent: ACPAgent,
  syncedAt: number,
): AgentRecord {
  return {
    id: randomUUID(),
    ...createCatalogOwnedFields(agent, syncedAt),
  };
}

export function prepareAgentCatalogRows(
  registry: ACPAgentRegistry,
  syncedAt: number,
): AgentCatalogWriteRow[] {
  return registry.agents.map((agent) => createCatalogAgentRecord(agent, syncedAt));
}

export function readCatalogAgentRecords(
  database: Database,
  reader: ReturnType<typeof createRegistryReader>,
  normalizedSearch = '',
): { record: AgentRecord; agent: ACPAgent }[] {
  return database
    .select()
    .from(agents)
    .where(and(eq(agents.catalogPresent, true),
      sql`instr(${agents.catalogSearchText}, ${normalizedSearch}) > 0`))
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

function createCatalogOwnedFields(
  agent: ACPAgent,
  syncedAt: number,
): Omit<AgentRecord, 'id'> {
  return {
    registryId: agent.id,
    registryMetadata: JSON.stringify(agent),
    catalogPresent: true,
    catalogSyncedAt: syncedAt,
    catalogSearchText: `${agent.id} ${agent.name} ${agent.description}`.toLowerCase(),
  };
}

function isCatalogAgentRecord(row: AgentRecord): boolean {
  return (
    row.registryId !== null ||
    row.registryMetadata !== null ||
    row.catalogPresent
  );
}

export function prepareSavedCatalogSearchProjection(
  database: Database,
  reader: ReturnType<typeof createRegistryReader>,
): AgentCatalogSearchProjectionJob {
  const rows = database.select().from(agents).where(and(eq(agents.catalogPresent, true),
    eq(agents.catalogSearchText, ''))).all();
  return { type: 'agentCatalogSearchProjection', rows: rows.flatMap((row) => {
    try {
      const { agent } = hydrateCatalogAgentRecord(row, reader);
      return [{ id: row.id, expectedRegistryMetadata: row.registryMetadata ?? '',
        catalogSearchText: `${agent.id} ${agent.name} ${agent.description}`.toLowerCase() }];
    } catch { return []; }
  }) };
}
