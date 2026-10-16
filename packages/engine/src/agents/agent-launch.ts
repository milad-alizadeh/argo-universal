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
