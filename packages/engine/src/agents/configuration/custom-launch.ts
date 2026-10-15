import { homedir } from 'node:os';
import type { CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { AgentLaunch, ResolveAgentLaunch } from '../agent-launch';
import { readCustomDefinition } from './configuration-sql';

const createLaunchEnvironment = (
  definition: CustomAgentDefinition,
): AgentLaunch['env'] =>
  Object.fromEntries(definition.env.map(({ name, value }) => [name, value]));

type LaunchProject = { id: string; path: string };

export type CustomLaunchInput = {
  agentId: string;
  definition: CustomAgentDefinition;
  project?: LaunchProject;
};

const outsideProject: LaunchProject = { id: '', path: homedir() };

export const createCustomAgentLaunch = ({
  agentId,
  definition,
  project = outsideProject,
}: CustomLaunchInput): AgentLaunch => ({
  projectId: project.id,
  agentId,
  executable: definition.executable,
  version: 'custom',
  args: definition.args,
  cwd: project.path,
  env: createLaunchEnvironment(definition),
  authContext: 'local',
});

export const resolveCustomAgentLaunch =
  (database: Database): ResolveAgentLaunch =>
  async ({ agent, projectId, projectPath }): Promise<AgentLaunch> => {
    const definition = readCustomDefinition(database, agent);

    if (!definition) throw new Error(`Agent ${agent} is not a custom Agent`);

    return createCustomAgentLaunch({
      agentId: agent,
      definition,
      project: { id: projectId, path: projectPath },
    });
  };
