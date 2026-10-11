import { homedir } from 'node:os';
import type { CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { AgentLaunch, ResolveAgentLaunch } from '../agent-launch';
import { readCustomDefinition } from './configuration-sql';

// A launch passes only the environment it names, so a program still finds commands and its home.
const inheritedNames = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'TMPDIR'];
const readInheritedEnvironment = (): Record<string, string> =>
  Object.fromEntries(
    inheritedNames.flatMap((name): [string, string][] => {
      const value = process.env[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
const createLaunchEnvironment = (
  definition: CustomAgentDefinition,
): Record<string, string> => ({
  ...readInheritedEnvironment(),
  ...Object.fromEntries(definition.env.map(({ name, value }) => [name, value])),
});

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
