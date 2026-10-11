import type { AgentCheck } from '@repo/contracts';

// How the Engine starts one Agent program; the ACP module launches it.
export type AgentLaunch = {
  projectId: string;
  agentId: string;
  executable: string;
  version: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  authContext: string;
};
export type ResolveAgentLaunch = (input: {
  agent: string;
  projectId: string;
  projectPath: string;
}) => Promise<AgentLaunch>;
export type AgentLaunchSubject = { name: string; launch: AgentLaunch };
// The port through which the ACP module checks that a program answers ACP initialize.
export type CheckAgentLaunch = (
  subject: AgentLaunchSubject,
) => Promise<AgentCheck>;
