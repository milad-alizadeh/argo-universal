import type { ACPAgent, AgentInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readAgentCatalog } from '../../catalog-sql';
import { readRegistryCache } from '../../registry/registry-cache';

const registryNames = (database: Database): Map<string, string> =>
  new Map(
    (readRegistryCache(database)?.agents ?? []).map(({ id, name }) => [
      id,
      name,
    ]),
  );

const catalogEntries = (database: Database): Map<string, ACPAgent> => {
  const names = registryNames(database);

  return new Map(
    readAgentCatalog(database).agents.map(({ id, entry }) => [
      id,
      { ...entry, name: names.get(entry.id) ?? entry.name },
    ]),
  );
};

const withEntry = (info: AgentInfo, entry?: ACPAgent): AgentInfo =>
  entry
    ? { ...info, label: entry.name, availableVersion: entry.version }
    : { ...info, availableVersion: undefined };

export const withRegistryMetadata = (
  database: Database,
  agents: AgentInfo[],
): AgentInfo[] => {
  const entries = catalogEntries(database);

  return agents.map((info) => withEntry(info, entries.get(info.agent)));
};
