import type { ConfiguredAgent, CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { AgentLaunch, ResolveAgentLaunch } from '../../agent-launch';
import { readConfiguredAgent } from '../../configuration/configuration-sql';
import {
  createCustomAgentLaunch,
  resolveCustomAgentLaunch,
} from '../../configuration/custom-launch';
import {
  readInstallSelection,
  selectedLaunchDefinition,
  type InstallSelection,
} from './selection';

type InstalledLaunch = {
  database: Database;
  home: string;
  agentId: string;
  selection: InstallSelection;
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

const installedVersion = (selection: InstallSelection): string =>
  selection.packageVersion ?? selection.entry.version;

const createInstalledLaunch = async (
  input: InstalledLaunch,
): Promise<AgentLaunch> => {
  const definition = await selectedLaunchDefinition(
    input.home,
    input.agentId,
    input.selection,
  );

  return overrideLaunch(
    installedLaunch(input, definition),
    readConfiguredAgent(input.database, input.agentId),
  );
};

const installedLaunch = (
  input: InstalledLaunch,
  definition: CustomAgentDefinition,
): AgentLaunch => ({
  ...launchForDefinition(input, definition),
  version: installedVersion(input.selection),
  registryId: input.selection.entry.id,
});

const selectLaunch = (
  source: { database: Database; home: string },
  input: Parameters<ResolveAgentLaunch>[0],
): Promise<AgentLaunch> => {
  const selection = readInstallSelection(source.database, input.agent);

  if (!selection) return resolveCustomAgentLaunch(source.database)(input);

  return createInstalledLaunch({
    ...source,
    agentId: input.agent,
    selection,
    project: { id: input.projectId, path: input.projectPath },
  });
};

export const resolveInstalledAgentLaunch =
  (database: Database, home: string): ResolveAgentLaunch =>
  (input) =>
    selectLaunch({ database, home }, input);
