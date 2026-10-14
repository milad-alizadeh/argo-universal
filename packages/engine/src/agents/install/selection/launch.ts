import type { ConfiguredAgent, CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { AgentLaunch, ResolveAgentLaunch } from '../../agent-launch';
import { readConfiguredAgent } from '../../configuration/configuration-sql';
import {
  createCustomAgentLaunch,
  resolveCustomAgentLaunch,
} from '../../configuration/custom-launch';
import { missingReason } from '../../readiness/readiness-target';
import {
  type Installation,
  readRegistrySource,
  type RegistrySource,
  resolveRegistryInstallation,
} from '../../resolver/installation';
import { selectedLaunchDefinition } from './selection';
type InstalledLaunch = {
  database: Database;
  home: string;
  agentId: string;
  source: RegistrySource;
  project: { id: string; path: string };
};
const overrideLaunch = (
  launch: AgentLaunch,
  agent: ConfiguredAgent | undefined,
): AgentLaunch => {
  if (agent?.configuration.source !== 'registry') return launch;
  const { args, env } = agent.configuration.overrides;
  return {
    ...launch,
    args: [...launch.args, ...args],
    env: {
      ...launch.env,
      ...Object.fromEntries(env.map(({ name, value }) => [name, value])),
    },
  };
};
const launchForDefinition = (
  { agentId, project }: InstalledLaunch,
  definition: CustomAgentDefinition,
): AgentLaunch => createCustomAgentLaunch({ agentId, definition, project });
// A copy whose version the Resolver could not read still gets a stable reuse key.
const unknownVersion = 'unknown';
const requireInstallation = async (
  input: InstalledLaunch,
): Promise<Installation> => {
  const found = await resolveRegistryInstallation(
    input.home,
    input.agentId,
    input.source,
  );
  if (found) return found;
  const { selection } = input.source;
  // Argo's copy is gone and nothing is on PATH: report its own missing file.
  if (selection)
    await selectedLaunchDefinition(input.home, input.agentId, selection);
  throw new Error(missingReason(input.source));
};
// Resolves again every time: a Session never trusts the saved Installation observation.
const createInstalledLaunch = async (
  input: InstalledLaunch,
): Promise<AgentLaunch> => {
  const { definition, version } = await requireInstallation(input);
  const launch = launchForDefinition(input, definition);
  const configured = readConfiguredAgent(input.database, input.agentId);
  return overrideLaunch(
    { ...launch, version: version ?? unknownVersion },
    configured,
  );
};
const registrySourceOf = (
  database: Database,
  agentId: string,
): RegistrySource | undefined =>
  readConfiguredAgent(database, agentId)?.configuration.source === 'custom'
    ? undefined
    : readRegistrySource(database, agentId);
const selectLaunch = (
  source: { database: Database; home: string },
  input: Parameters<ResolveAgentLaunch>[0],
): Promise<AgentLaunch> => {
  const registry = registrySourceOf(source.database, input.agent);
  if (!registry) return resolveCustomAgentLaunch(source.database)(input);
  return createInstalledLaunch({
    ...source,
    agentId: input.agent,
    source: registry,
    project: { id: input.projectId, path: input.projectPath },
  });
};
export const resolveInstalledAgentLaunch =
  (database: Database, home: string): ResolveAgentLaunch =>
  (input) =>
    selectLaunch({ database, home }, input);
