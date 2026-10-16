// How the Engine starts one Agent program; the ACP module launches it.
export type AgentLaunch = {
  projectId: string;
  agentId: string;
  registryId?: string;
  installationDirectory?: string;
  executable: string;
  version: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  authContext: string;
  release?: () => void;
};

/*
 * An Installed Agent's launch before its command is resolved. ACP resources
 * reuse a connection of the same `version` and call `resolve` only to start
 * one; they release the resolved launch once that connection owns its folder.
 */
export type DeferredAgentLaunch = {
  projectId: string;
  agentId: string;
  version: string;
  resolve: (signal: AbortSignal) => Promise<AgentLaunch>;
};

export type ResolveAgentLaunch = (input: {
  agent: string;
  projectId: string;
  projectPath: string;
  signal?: AbortSignal;
}) => Promise<AgentLaunch>;

export type LoginTerminalProcess = {
  exited: Promise<{ exitCode: number; signal?: number }>;
  write: (input: string) => void;
  resize: (cols: number, rows: number) => void;
  close: () => Promise<void>;
};

export type LaunchLoginTerminal = (
  launch: AgentLaunch,
  output: (text: string) => void,
) => Promise<LoginTerminalProcess>;
