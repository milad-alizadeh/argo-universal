import {
  SessionOpenFailure,
  type ACPAgent,
  type AgentServerEnvironment,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../../projects';
import type { AcpResources } from '../acp';
import type { AgentLaunch, DeferredAgentLaunch } from '../agent-launch';
import { definedEnvironment } from '../launch/agent-environment';
import { getEntryCommand, getRegistryEntry } from '../launch/get-command';
import type { InstallPorts } from '../launch/ports';
import { shellEnvironment } from '../launch/shell-env';
import type { CommandInput, RegistryCommand } from '../launch/types';
import type { RegistryActor } from '../registry/registry-machine';
import { readAgentServer } from './agent-servers-sql';

// A Registry Agent the user installed on this Server: its agent_servers row.
export type InstalledAgent = { id: string; env: AgentServerEnvironment };

type InstalledAgentAnswer =
  | { installed: true; agent: InstalledAgent }
  | { installed: false; message: string };

/*
 * Which Agents can start Sessions on this Server, and how one starts.
 * The caller decides what an Agent that is not installed means;
 * `launch` reads the Registry version and makes no ACP call; its `resolve`
 * downloads the Agent on first launch.
 */
export type InstalledAgents = {
  installedAgent: (id: string) => InstalledAgentAnswer;
  launch: (
    agent: InstalledAgent,
    projectId: string,
    options: {
      signal: AbortSignal;
      onInstalling?: (progress?: number) => void;
    },
  ) => Promise<DeferredAgentLaunch>;
};

export type InstalledAgentsInput = {
  database: Database;
  home: string;
  registry: RegistryActor;
  resources: Pick<AcpResources, 'isDirectoryInUse'>;
  ports: InstallPorts;
};

export const createInstalledAgents = (
  input: InstalledAgentsInput,
): InstalledAgents => ({
  installedAgent: (id) => {
    const agent = readAgentServer(input.database, id);

    return agent
      ? { installed: true, agent }
      : { installed: false, message: `Agent "${id}" is not installed.` };
  },
  launch: (agent, projectId, options) =>
    launchInstalledAgent(input, { agent, projectId, ...options }),
});

// New Session, Send, open, Retry and sign-in admit only an Installed Agent, and all show this one open failure otherwise.
export const requireInstalledAgent = (
  installedAgents: Pick<InstalledAgents, 'installedAgent'>,
  id: string,
): InstalledAgent => {
  const answer = installedAgents.installedAgent(id);

  if (!answer.installed) throw notInstalledError(answer.message);

  return answer.agent;
};

const notInstalledError = (message: string): TRPCError =>
  new TRPCError({
    code: 'PRECONDITION_FAILED',
    message,
    cause: new SessionOpenFailure({ type: 'failed', message }),
  });

type LaunchSubject = {
  agent: InstalledAgent;
  projectId: string;
  signal: AbortSignal;
  onInstalling?: (progress?: number) => void;
};

// The Registry version is read now; the command is resolved only when ACP resources start a connection.
const launchInstalledAgent = async (
  input: InstalledAgentsInput,
  subject: LaunchSubject,
): Promise<DeferredAgentLaunch> => {
  const { agent, projectId, signal } = subject;
  const entry = await getRegistryEntry({ ...input, id: agent.id, signal });
  const cwd = readProjectPath(input.database, projectId);

  return {
    agentId: agent.id,
    projectId,
    version: entry.version,
    resolve: (resolving) =>
      resolveLaunch(input, { ...subject, signal: resolving }, { entry, cwd }),
  };
};

const resolveLaunch = async (
  input: InstalledAgentsInput,
  subject: LaunchSubject,
  { entry, cwd }: { entry: ACPAgent; cwd: string },
): Promise<AgentLaunch> => {
  const command = await getEntryCommand(
    await commandInput(input, subject, cwd),
    entry,
  );

  return { ...agentLaunch(command, subject), cwd };
};

// The Project's main Checkout is the Agent's folder and the source of its login-shell env (ADR-0004).
const commandInput = async (
  input: InstalledAgentsInput,
  { agent, signal, onInstalling }: LaunchSubject,
  cwd: string,
): Promise<CommandInput> => ({
  database: input.database,
  registry: input.registry,
  home: input.home,
  id: agent.id,
  ports: installationPorts(input.ports, onInstalling),
  shellEnv: definedEnvironment(await shellEnvironment(cwd)),
  signal,
  isDirectoryInUse: input.resources.isDirectoryInUse,
});

const installationPorts = (
  ports: InstallPorts,
  onInstalling?: (progress?: number) => void,
): InstallPorts => ({
  runTool: (tool) => {
    if (tool.args.includes('install')) onInstalling?.();

    return ports.runTool(tool);
  },
  download: async (url, signal) => {
    onInstalling?.();
    const bytes = await ports.download(url, signal, onInstalling);
    // Extraction and verification have no measurable total.
    onInstalling?.();

    return bytes;
  },
});

// The row's env goes last, over the Registry distribution's and the vendor module's.
const agentLaunch = (
  command: RegistryCommand,
  { agent, projectId }: LaunchSubject,
): Omit<AgentLaunch, 'cwd'> => ({
  executable: command.executable,
  args: command.args,
  version: command.version,
  release: command.release,
  env: { ...command.env, ...agent.env },
  installationDirectory: command.directory,
  agentId: agent.id,
  registryId: agent.id,
  projectId,
  authContext: 'local',
});
