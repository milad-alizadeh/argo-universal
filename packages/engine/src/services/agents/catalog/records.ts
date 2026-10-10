import { randomUUID } from 'node:crypto';
import {
  AgentRecord,
  type ACPAgent,
  type ACPAgentRegistry,
  type AgentsCatalogOutput,
  type AgentsCatalogInput,
  type RegistrySupport,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { AgentCatalogWriteRow } from '../agent-storage';
import type { RegistryReader } from './registry-reader';

function createCatalogAgentRecord(
  agent: ACPAgent,
  syncedAt: number,
): AgentCatalogWriteRow {
  return {
    id: randomUUID(),
    ...createCatalogOwnedFields(agent, syncedAt),
  };
}

export function prepareAgentCatalogRows(
  registry: ACPAgentRegistry,
  syncedAt: number,
): AgentCatalogWriteRow[] {
  return registry.agents.map((agent) =>
    createCatalogAgentRecord(agent, syncedAt),
  );
}

interface CatalogAgentReadInput {
  reader: RegistryReader;
  platform: string;
}

export function readCatalogAgentRecords(
  database: Database,
  reader: RegistryReader,
  request: AgentsCatalogInput,
): AgentsCatalogOutput['agents'] {
  const search = (request?.search ?? '').trim().toLowerCase();
  const predicate = and(
    eq(agents.catalogPresent, true),
    sql`instr(${agents.catalogSearchText}, ${search}) > 0`,
  );
  const rows = database.select().from(agents).where(predicate).all();
  const input = { reader, platform: resolveRegistryServerPlatform() };
  return rows.map((row) => hydrateCatalogAgentRecord(row, input));
}

function hydrateCatalogAgentRecord(
  row: AgentRecord,
  { reader, platform }: CatalogAgentReadInput,
): AgentsCatalogOutput['agents'][number] {
  const parsed = AgentRecord.safeParse(row);
  if (!parsed.success)
    return reader.reject('Stored Agent row is malformed', parsed.error);
  const record = parsed.data;
  const agent = reader.parseAgent(record.registryMetadata);
  if (agent.id !== record.registryId)
    reader.reject('Stored Agent registry identity does not match metadata');
  const support = selectAgentDistribution(agent, platform);
  return { id: record.id, entry: agent, support };
}

function selectAgentDistribution(
  agent: ACPAgent,
  platform: string,
): RegistrySupport {
  const binary = agent.distribution.binary?.[platform];
  if (binary) return { kind: 'binary', recipe: binary };
  return selectPackageDistribution(agent, platform);
}

function selectPackageDistribution(
  agent: ACPAgent,
  platform: string,
): RegistrySupport {
  const packageKind = agent.distribution.npx ? 'npx' : 'uvx';
  const recipe = agent.distribution[packageKind];
  if (recipe) return { kind: packageKind, recipe };
  return { kind: 'unsupported', reason: `No distribution for ${platform}` };
}

export function resolveRegistryServerPlatform(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  return `${os}-${resolveRegistryServerArchitecture()}`;
}

function resolveRegistryServerArchitecture(): string {
  if (process.arch === 'arm64') return 'aarch64';
  return process.arch === 'x64' ? 'x86_64' : process.arch;
}

function createCatalogOwnedFields(
  agent: ACPAgent,
  syncedAt: number,
): Omit<AgentCatalogWriteRow, 'id'> {
  return {
    registryId: agent.id,
    registryMetadata: JSON.stringify(agent),
    catalogPresent: true,
    catalogSyncedAt: syncedAt,
    catalogSearchText: normalizeAgentSearchText(agent),
  };
}

function normalizeAgentSearchText(agent: ACPAgent): string {
  return `${agent.id} ${agent.name} ${agent.description}`.toLowerCase();
}
