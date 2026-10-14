import type { AgentCheck, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  readConfiguredAgent,
  readConfiguredAgents,
} from '../configuration/configuration-sql';
import {
  readRegistrySource,
  type RegistrySource,
  resolveRegistryInstallation,
} from '../resolver/installation';
import { ReadinessSkipped } from './readiness-skipped';

export type ReadinessTarget = {
  agentId: string;
  name: string;
  registry?: RegistrySource;
};

const notFoundReason = (name: string): string =>
  `The installed files of ${name} are missing. Repair installs them again.`;

// A copy Argo did not install has no files of Argo's to restore; Repair installs Argo's own.
const notOnThisMacReason = (name: string): string =>
  `${name} is no longer on this Mac. Repair installs it with Argo.`;

export const missingReason = ({ entry, selection }: RegistrySource): string =>
  selection ? notFoundReason(entry.name) : notOnThisMacReason(entry.name);

const configured = (agent: ConfiguredAgent | undefined): ConfiguredAgent => {
  if (!agent || agent.configuration.removed)
    throw new ReadinessSkipped('Agent was removed.');

  return agent;
};

const enabled = (agent: ConfiguredAgent): ConfiguredAgent => {
  if (!agent.enabled)
    throw new ReadinessSkipped('Agent is disabled. Enable it to check it.');

  return agent;
};

const registryTarget = (
  database: Database,
  agentId: string,
): ReadinessTarget => {
  const registry = readRegistrySource(database, agentId);

  if (!registry) throw new ReadinessSkipped('Agent is not installed.');

  return { agentId, name: registry.entry.name, registry };
};

// Only a configured, enabled Agent is ever checked; anything else is skipped, never launched.
export const readTarget = (
  database: Database,
  agentId: string,
): ReadinessTarget => {
  const agent = enabled(configured(readConfiguredAgent(database, agentId)));

  return agent.configuration.source === 'custom'
    ? { agentId, name: agent.configuration.definition.name }
    : registryTarget(database, agentId);
};

export const checkableAgents = (database: Database): string[] =>
  readConfiguredAgents(database).flatMap((agent) => {
    try {
      return [readTarget(database, agent.id).agentId];
    } catch {
      return [];
    }
  });

// Nothing the Resolver can find is Not found without launching anything; identity and Sessions stay.
export const missingFiles = async (
  home: string,
  target: ReadinessTarget,
): Promise<AgentCheck | null> => {
  const { agentId, registry } = target;

  if (!registry) return null;
  const found = await resolveRegistryInstallation(home, agentId, registry);

  return found
    ? null
    : { status: 'not-found', reason: missingReason(registry) };
};
