import type { Database } from '@repo/db';
import type { AcpResources } from '../acp';
import type { AgentLaunch, ResolveAgentLaunch } from '../agent-launch';
import type { RegistryActor } from '../registry/registry-machine';
import { requireAgentServer } from '../servers/agent-servers-sql';
import { definedEnvironment } from './agent-environment';
import { getCommand } from './get-command';
import type { InstallPorts } from './ports';
import { shellEnvironment } from './shell-env';

type SavedLaunchSource = {
  database: Database;
  registry?: RegistryActor;
  home: string;
  resources: AcpResources;
  ports?: InstallPorts;
};

type LaunchInput = Parameters<ResolveAgentLaunch>[0];

export const resolveSavedAgentLaunch =
  (source: SavedLaunchSource): ResolveAgentLaunch =>
  async (input) => {
    requireAgentServer(source.database, input.agent);
    const command = await getCommand(await commandInput(source, input));

    return {
      ...command,
      installationDirectory: command.directory,
      agentId: input.agent,
      registryId: input.agent,
      projectId: input.projectId,
      cwd: input.projectPath,
      authContext: 'local',
    } satisfies AgentLaunch;
  };

const commandInput = async (
  source: SavedLaunchSource,
  input: LaunchInput,
): Promise<Parameters<typeof getCommand>[0]> => ({
  database: source.database,
  registry: requiredRegistry(source),
  home: source.home,
  id: input.agent,
  ports: source.ports,
  shellEnv: definedEnvironment(await shellEnvironment(input.projectPath)),
  signal: input.signal ?? new AbortController().signal,
  isDirectoryInUse: source.resources.isDirectoryInUse,
});

const requiredRegistry = (source: SavedLaunchSource): RegistryActor => {
  if (!source.registry) throw new Error('Registry is not running');

  return source.registry;
};
