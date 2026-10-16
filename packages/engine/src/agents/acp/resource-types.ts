import type {
  ClientContext,
  ClientRequestHandlersByMethod,
  InitializeResponse,
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
import type { AuthChanges } from '../auth/auth-changes';
import type { ConnectionAuthentication } from '../auth/authenticate';

export type AcpSessionOpening =
  | { method: 'session/new'; params: NewSessionRequest }
  | { method: 'session/resume'; params: ResumeSessionRequest };

export type AcpSessionDestination = {
  registrationFinished?: Promise<void>;
  update: (notification: SessionNotification) => undefined;
  failed: (cause: unknown) => void;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};

export type AcpSessionLease = {
  authentication?: ConnectionAuthentication;
  agent: ClientContext;
  sessionId: SessionId;
  initialization: InitializeResponse;
  response: NewSessionResponse | ResumeSessionResponse;
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
  exitError?: () => Error;
  terminate: () => Promise<void>;
};

export type AcpResourceInput = {
  launchLoginTerminal?: LaunchLoginTerminal;
  launchProcess?: (launch: AgentLaunch) => Promise<AcpProcess>;
  closeTimeoutMs?: number;
};

export type AcpResources = {
  authentication: (launch: AgentLaunch) => Promise<ConnectionAuthentication>;
  findAuthentication: (
    agent: string,
    projectId: string,
  ) => Promise<ConnectionAuthentication> | undefined;
  authChanges: Pick<AuthChanges, 'watch'>;
  invalidateAgent: (agentId: string) => void;
  dropAgentConnections: (agentId: string) => void;
  isDirectoryInUse: (directory: string) => boolean;
  invalidateIdleAgents: (agentId?: string) => void;
  isAgentInUse: (agentId: string) => boolean;
  open: (input: AcpOpenInput) => Promise<AcpSessionLease>;
  reserveAuthentication: (launch: AgentLaunch) => () => void;
  shutdown: () => Promise<void>;
};
