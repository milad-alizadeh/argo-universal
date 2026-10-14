import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { withUpdateCommands } from './agent-update-commands';
import { versionsOf, withAvailableVersions } from './agent-versions';
import { readConfiguredAgents } from './configuration/configuration-sql';
import { readSavedReadiness } from './readiness/readiness-sql';
import { missingReason } from './readiness/readiness-target';
import {
  readRegistrySource,
  type RegistrySource,
} from './resolver/installation';
import {
  type InstallationObservation,
  readInstallationObservations,
} from './resolver/observation-sql';

type Listing = {
  database: Database;
  home: string;
  saved: ReturnType<typeof readSavedReadiness>;
  observed: ReturnType<typeof readInstallationObservations>;
};

const savedStatus = (
  listing: Listing,
  agentId: string,
): Pick<AgentInfo, 'status' | 'reason'> => {
  const { status, reason } = listing.saved(agentId);

  return reason === undefined ? { status } : { status, reason };
};

const customInfo = (
  listing: Listing,
  agent: ConfiguredAgent,
  name: string,
): AgentInfo => ({
  agent: agent.id,
  label: name,
  logo: '',
  enabled: agent.enabled,
  ...versionsOf(undefined, listing.saved(agent.id).agentVersion),
  ...savedStatus(listing, agent.id),
});

// The Resolver's saved observation decides installed or Not found; a found copy shows its last Readiness.
const installedStatus = (
  listing: Listing,
  agentId: string,
  source: RegistrySource,
): Pick<AgentInfo, 'status' | 'reason'> => {
  const observation = listing.observed(agentId);

  if (observation.observed && !observation.found)
    return { status: 'not-found', reason: missingReason(source) };
  const saved = savedStatus(listing, agentId);

  // Found again after it went missing: Checking… until its new check lands.
  return saved.status === 'not-found' ? { status: 'checking' } : saved;
};

const notInstalled = (agent: ConfiguredAgent): AgentInfo => ({
  agent: agent.id,
  label: agent.id,
  logo: '',
  enabled: agent.enabled,
  status: 'not-installed',
  reason: 'Install this Agent from Agents.',
});

const ownerOf = (
  observation: InstallationObservation,
): Pick<AgentInfo, 'owner'> =>
  observation.observed && observation.found ? { owner: observation.owner } : {};

// Before the Resolver has looked once, only an Argo installation counts as installed.
const isInstalled = (
  observation: InstallationObservation,
  source: RegistrySource,
): boolean => observation.observed || !!source.selection;

const identityOf = (
  source: RegistrySource,
): Pick<AgentInfo, 'label' | 'logo'> => {
  const { name, icon } = source.entry;

  return { label: name, logo: icon ?? '' };
};

// The found copy's own version, or Argo's installed release before the Resolver has looked.
const installedVersion = (
  observation: InstallationObservation,
  source: RegistrySource,
): string | undefined =>
  observation.observed && observation.found
    ? observation.version
    : source.selection?.entry.version;

const installedVersions = (
  listing: Listing,
  agentId: string,
  source: RegistrySource,
): ReturnType<typeof versionsOf> =>
  versionsOf(
    installedVersion(listing.observed(agentId), source),
    listing.saved(agentId).agentVersion,
  );

const registryInfo = (listing: Listing, agent: ConfiguredAgent): AgentInfo => {
  const source = readRegistrySource(listing.database, agent.id);
  const observation = listing.observed(agent.id);

  if (!source || !isInstalled(observation, source)) return notInstalled(agent);

  return {
    agent: agent.id,
    enabled: agent.enabled,
    ...identityOf(source),
    ...installedVersions(listing, agent.id, source),
    ...ownerOf(observation),
    ...installedStatus(listing, agent.id, source),
  };
};

const describe = async (
  listing: Listing,
  agent: ConfiguredAgent,
): Promise<AgentInfo> =>
  agent.configuration.source === 'custom'
    ? customInfo(listing, agent, agent.configuration.definition.name)
    : registryInfo(listing, agent);

const registryFirst = (agents: ConfiguredAgent[]): ConfiguredAgent[] => [
  ...agents.filter(({ configuration }) => configuration.source === 'registry'),
  ...agents.filter(({ configuration }) => configuration.source === 'custom'),
];

const openListing = (database: Database, home: string): Listing => ({
  database,
  home,
  saved: readSavedReadiness(database),
  observed: readInstallationObservations(database),
});

const readListedAgents = (database: Database): ConfiguredAgent[] =>
  readConfiguredAgents(database).filter(
    ({ configuration }) => !configuration.removed,
  );

const withVersionsAndCommands = (
  listing: Listing,
  listed: AgentInfo[],
): Promise<AgentInfo[]> =>
  withUpdateCommands(
    listing.database,
    withAvailableVersions(listing.database, listed),
    listing.observed,
  );

// Every configured Agent from its saved Readiness; listing launches no Agent (ADR-0002).
export const listAgents = async (
  database: Database,
  home: string,
): Promise<AgentInfo[]> => {
  const listing = openListing(database, home);

  const listed = await Promise.all(
    registryFirst(readListedAgents(database)).map((agent) =>
      describe(listing, agent),
    ),
  );

  return withVersionsAndCommands(listing, listed);
};
