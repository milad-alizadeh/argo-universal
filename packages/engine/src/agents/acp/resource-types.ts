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
import type { AgentLaunch } from '..';
import type { LaunchLoginTerminal } from '..';

export type AcpSessionOpening =
  | { method: 'session/new'; params: NewSessionRequest }
  | { method: 'session/load'; params: LoadSessionRequest }
  | { method: 'session/resume'; params: ResumeSessionRequest };

export type AcpSessionDestination = {
  update: (notification: SessionNotification) => undefined;
  failed: (cause: unknown) => void;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};

export type AcpSessionLease = {
  agent: ClientContext;
  sessionId: SessionId;
  initialization: InitializeResponse;
  response: NewSessionResponse | LoadSessionResponse | ResumeSessionResponse;
  close: () => Promise<void>;
  replace: (input: Omit<AcpOpenInput, 'launch'>) => Promise<AcpSessionLease>;
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
  launchLoginTerminal?: LaunchLoginTerminal;
  launchProcess?: (launch: AgentLaunch) => Promise<AcpProcess>;
  closeTimeoutMs?: number;
  // How long a Readiness check waits for ACP initialize.
  checkTimeoutMs?: number;
  releaseTimeoutMs?: number;
  // Called when the Agent answers a request with auth_required.
  onSignInRequired?: () => void;
};

export type AcpResources = {
  isAgentInUse: (agentId: string) => boolean;
  open: (input: AcpOpenInput) => Promise<AcpSessionLease>;
  reserveAuthentication: (launch: AgentLaunch) => () => void;
  settleAuthentication: (launch: AgentLaunch) => Promise<void>;
  observeSignInRequired: (listener: (agentId: string) => void) => void;
  shutdown: () => Promise<void>;
};
