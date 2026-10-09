import type {
  ACPAgent,
  AgentsCatalogInput,
  AgentsCatalogOutput,
  RegistrySupport,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { readCatalogAgentRecords } from './records';
import type { createRegistryReader } from './registry';

export interface CatalogReadInput {
  database: Database;
  reader: ReturnType<typeof createRegistryReader>;
  platform: string;
  error: string | null;
  syncedAt: number | null;
}

export function selectAgentDistribution(
  agent: ACPAgent,
  serverPlatform: string,
): RegistrySupport {
  const binary = agent.distribution.binary?.[serverPlatform];
  if (binary) return { kind: 'binary', recipe: binary };
  return selectPackageDistribution(agent, serverPlatform);
}

function selectPackageDistribution(
  agent: ACPAgent,
  serverPlatform: string,
): RegistrySupport {
  const packageKind = agent.distribution.npx ? 'npx' : 'uvx';
  const recipe = agent.distribution[packageKind];
  if (recipe) return { kind: packageKind, recipe };
  return {
    kind: 'unsupported',
    reason: `No distribution for ${serverPlatform}`,
  };
}

function matchesSearch(agent: ACPAgent, normalizedSearch: string): boolean {
  return `${agent.id} ${agent.name} ${agent.description}`
    .toLowerCase()
    .includes(normalizedSearch);
}

function normalizeCatalogSearch(request: AgentsCatalogInput): string {
  return (request?.search ?? '').trim().toLowerCase();
}

export function readAgentCatalog(
  input: CatalogReadInput,
  request: AgentsCatalogInput,
): AgentsCatalogOutput {
  try {
    return buildCatalogResult(input, request);
  } catch (error) {
    return buildUnavailableCatalogResult(input, error);
  }
}

function buildCatalogResult(
  input: CatalogReadInput,
  request: AgentsCatalogInput,
): AgentsCatalogOutput {
  const result = readCatalogEntriesWithSyncTime(input, request);
  return {
    ...result,
    serverPlatform: input.platform,
    status: deriveCatalogStatus(result.fetchedAt, input.error),
    error: input.error,
    rejectedValues: input.reader.count(),
  };
}

type CatalogRecords = ReturnType<typeof readCatalogAgentRecords>;

function buildCatalogEntries(
  records: CatalogRecords,
  normalizedSearch: string,
  serverPlatform: string,
): AgentsCatalogOutput['agents'] {
  return records
    .filter(
      ({ record, agent }) =>
        record.catalogPresent && matchesSearch(agent, normalizedSearch),
    )
    .map((row) => buildCatalogEntry(row, serverPlatform));
}

function readCatalogSyncTimestamp(
  records: CatalogRecords,
  lastSyncAt: number | null,
): number | null {
  if (!records.length) return lastSyncAt;
  return (
    Math.max(...records.map(({ record }) => record.catalogSyncedAt ?? 0)) ||
    null
  );
}

function deriveCatalogStatus(
  syncedAt: number | null,
  error: string | null,
): AgentsCatalogOutput['status'] {
  if (syncedAt === null) return 'unavailable';
  return error ? 'stale' : 'fresh';
}

function buildUnavailableCatalogResult(
  input: CatalogReadInput,
  error: unknown,
): AgentsCatalogOutput {
  return {
    agents: [],
    serverPlatform: input.platform,
    status: 'unavailable',
    fetchedAt: null,
    error: String(error),
    rejectedValues: input.reader.count(),
  };
}

export function resolveRegistryServerPlatform(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  return `${os}-${resolveRegistryServerArchitecture()}`;
}

function resolveRegistryServerArchitecture(): string {
  if (process.arch === 'arm64') return 'aarch64';
  return process.arch === 'x64' ? 'x86_64' : process.arch;
}

function buildCatalogEntry(
  { record, agent }: CatalogRecords[number],
  serverPlatform: string,
): AgentsCatalogOutput['agents'][number] {
  return {
    id: record.id,
    entry: agent,
    support: selectAgentDistribution(agent, serverPlatform),
  };
}

function readCatalogEntriesWithSyncTime(
  input: CatalogReadInput,
  request: AgentsCatalogInput,
): Pick<AgentsCatalogOutput, 'agents' | 'fetchedAt'> {
  const records = readCatalogAgentRecords(input.database, input.reader);
  const search = normalizeCatalogSearch(request);
  return {
    agents: buildCatalogEntries(records, search, input.platform),
    fetchedAt: readCatalogSyncTimestamp(records, input.syncedAt),
  };
}
