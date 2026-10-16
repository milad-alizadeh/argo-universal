import type {
  AgentLoginTerminalFrame,
  AgentLoginTerminalInput,
  AgentCheck,
} from '@repo/contracts';

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

export type LoginAgentMethod = {
  id: string;
  name: string;
  description?: string;
  terminal?: { args: readonly string[]; env: Readonly<Record<string, string>> };
};

export type LoginAgentRequest = { id: string; url: string; message: string };

export type LoginAgentOutcome = {
  status: 'ready' | 'account-rejected' | 'authentication-required';
  failure?: string;
};

export type LoginAgentCallbacks = {
  reserveTerminalAuthentication?: (launch: AgentLaunch) => void;
  createElicitation: (
    request: LoginAgentRequest,
    signal?: AbortSignal,
  ) => Promise<{ action: 'accept' | 'decline' | 'cancel' }>;
  signal: AbortSignal;
};

export type LoginAgentConnection = {
  methods: readonly LoginAgentMethod[];
  authenticate: (methodId: string) => Promise<void>;
  checkReady: () => Promise<LoginAgentOutcome>;
  close: () => Promise<void>;
  terminalActive?: () => boolean;
  readTerminal?: (cursor: number) => AgentLoginTerminalFrame;
  inputTerminal?: (input: AgentLoginTerminalInput) => void;
};

export type OpenLoginAgent = (
  subject: AgentLaunchSubject,
  callbacks: LoginAgentCallbacks,
) => Promise<LoginAgentConnection>;

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
