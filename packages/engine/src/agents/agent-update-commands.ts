import type { AgentInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readRegistrySource } from './resolver/installation';
import type { InstallationObservation } from './resolver/observation-sql';
import { type OwnedCopy, ownerUpdateCommand } from './resolver/owner-update';

type Observed = (agentId: string) => InstallationObservation;

const isOutdated = (
  info: AgentInfo,
): info is AgentInfo & { availableVersion: string } =>
  info.status === 'update-available' && info.availableVersion !== undefined;

const foundCopy = (
  observation: InstallationObservation,
): Extract<InstallationObservation, { found: true }> | undefined =>
  observation.observed && observation.found ? observation : undefined;

const outdatedCopy = (
  database: Database,
  observed: Observed,
  info: AgentInfo,
): OwnedCopy | undefined => {
  const found = foundCopy(observed(info.agent));
  const source = readRegistrySource(database, info.agent);

  if (!isOutdated(info) || !found || !source) return undefined;

  return { ...found, entry: source.entry, version: info.availableVersion };
};

const withUpdateCommand = async (
  database: Database,
  observed: Observed,
  info: AgentInfo,
): Promise<AgentInfo> => {
  const copy = outdatedCopy(database, observed, info);
  const command = copy && (await ownerUpdateCommand(copy));

  return command ? { ...info, updateCommand: command } : info;
};

// An outdated copy Argo did not install names the command its owner updates it with.
export const withUpdateCommands = (
  database: Database,
  agents: AgentInfo[],
  observed: Observed,
): Promise<AgentInfo[]> =>
  Promise.all(
    agents.map((info) => withUpdateCommand(database, observed, info)),
  );
