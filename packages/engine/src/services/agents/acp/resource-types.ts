import type {
  ClientContext,
  ClientRequestHandlersByMethod,
  InitializeResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  NewSessionRequest,
  NewSessionResponse,
  ResumeSessionRequest,
  ResumeSessionResponse,
  SessionId,
  SessionNotification,
  Stream,
} from '@agentclientprotocol/sdk';

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
export type AcpSessionOpening =
  | { method: 'session/new'; params: NewSessionRequest }
  | { method: 'session/load'; params: LoadSessionRequest }
  | { method: 'session/resume'; params: ResumeSessionRequest };
export type AcpSessionDestination = {
  update: (notification: SessionNotification) => undefined;
  failed: (error: unknown) => void;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};
export type AcpSessionLease = {
  agent: ClientContext;
  sessionId: SessionId;
  initialization: InitializeResponse;
  response: NewSessionResponse | LoadSessionResponse | ResumeSessionResponse;
  close: () => Promise<void>;
  readonly released: Promise<void>;
};
export type AcpOpenInput = {
  launch: AgentLaunch;
  opening: AcpSessionOpening;
  destination: AcpSessionDestination;
  signal?: AbortSignal;
};
export type AcpProcess = {
  stream: Stream;
  exited: Promise<void>;
  terminate: () => Promise<void>;
};
export type AcpResourceInput = {
  launchProcess?: (launch: AgentLaunch) => Promise<AcpProcess>;
  closeTimeoutMs?: number;
  releaseTimeoutMs?: number;
};
export type AcpResources = {
  open: (input: AcpOpenInput) => Promise<AcpSessionLease>;
  shutdown: () => Promise<void>;
};
export type ResolveAgentLaunch = (input: {
  agent: string;
  projectId: string;
  projectPath: string;
}) => Promise<AgentLaunch>;
