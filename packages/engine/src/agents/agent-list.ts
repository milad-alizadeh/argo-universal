import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readAgentCatalog } from './catalog-sql';
import { readConfiguredAgents } from './configuration/configuration-sql';
import {
  checkSelectedFiles,
  readInstallSelection,
} from './install/selection/selection';
import { readSavedReadiness } from './readiness/readiness-sql';
import { notFoundReason } from './readiness/readiness-target';

type Listing = {
  database: Database;
  home: string;
  saved: ReturnType<typeof readSavedReadiness>;
};
const savedStatus = (
  listing: Listing,
  agentId: string,
): Pick<AgentInfo, 'status' | 'reason'> => listing.saved(agentId);

const customInfo = (
  listing: Listing,
  agent: ConfiguredAgent,
  name: string,
): AgentInfo => ({
  agent: agent.id,
  label: name,
  logo: '',
  enabled: agent.enabled,
  ...savedStatus(listing, agent.id),
});

// A missing launch file is visible without launching anything; identity and Sessions stay.
const installedStatus = async (
  listing: Listing,
  agentId: string,
  selection: NonNullable<ReturnType<typeof readInstallSelection>>,
): Promise<Pick<AgentInfo, 'status' | 'reason'>> => {
  try {
    await checkSelectedFiles(listing.home, agentId, selection);
    return savedStatus(listing, agentId);
  } catch {
    return {
      status: 'not-found',
      reason: notFoundReason(selection.entry.name),
    };
  }
};

const notInstalled = (agent: ConfiguredAgent): AgentInfo => ({
  agent: agent.id,
  label: agent.id,
  logo: '',
  enabled: agent.enabled,
  status: 'not-installed',
});
const registryInfo = async (
  listing: Listing,
  agent: ConfiguredAgent,
): Promise<AgentInfo> => {
  const selection = readInstallSelection(listing.database, agent.id);
  if (!selection) return notInstalled(agent);
  const { name, icon, version } = selection.entry;
  const identity = { label: name, logo: icon ?? '', version };
  const status = await installedStatus(listing, agent.id, selection);
  return { agent: agent.id, enabled: agent.enabled, ...identity, ...status };
};

const describe = async (
  listing: Listing,
  agent: ConfiguredAgent,
): Promise<AgentInfo> =>
  agent.configuration.source === 'custom'
    ? customInfo(listing, agent, agent.configuration.definition.name)
    : registryInfo(listing, agent);

const withAvailableVersions = (
  database: Database,
  agents: AgentInfo[],
): AgentInfo[] => {
  const catalog = new Map(
    readAgentCatalog(database).agents.map(({ id, entry }) => [
      id,
      entry.version,
    ]),
  );
  return agents.map((info) => {
    const availableVersion = catalog.get(info.agent);
    return availableVersion ? { ...info, availableVersion } : info;
  });
};
const registryFirst = (agents: ConfiguredAgent[]): ConfiguredAgent[] => [
  ...agents.filter(({ configuration }) => configuration.source === 'registry'),
  ...agents.filter(({ configuration }) => configuration.source === 'custom'),
];

// Every configured Agent from its saved Readiness; listing launches no Agent (ADR-0002).
export const listAgents = async (
  database: Database,
  home: string,
): Promise<AgentInfo[]> => {
  const listing = { database, home, saved: readSavedReadiness(database) };
  const configured = readConfiguredAgents(database).filter(
    ({ configuration }) => !configuration.removed,
  );
  return withAvailableVersions(
    database,
    await Promise.all(
      registryFirst(configured).map((agent) => describe(listing, agent)),
    ),
  );
};
