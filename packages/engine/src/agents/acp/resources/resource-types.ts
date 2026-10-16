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
import type { AgentLaunch, DeferredAgentLaunch } from '../..';
import type { LaunchLoginTerminal } from '../..';
import type { AuthChanges } from '../../auth/auth-changes';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import type { TerminalRequests } from '../shell-commands/terminal-requests';

export type AcpSessionOpening =
  | { method: 'session/new'; params: NewSessionRequest }
  | { method: 'session/resume'; params: ResumeSessionRequest };

export type AcpSessionDestination = {
  registrationFinished?: Promise<void>;
  terminalRequests?: TerminalRequests;
  update: (notification: SessionNotification) => undefined;
  failed: (cause: unknown) => void;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};

export type AcpSessionLease = {
  launch: AgentLaunch;
  authentication?: ConnectionAuthentication;
  agent: ClientContext;
  sessionId: SessionId;
  initialization: InitializeResponse;
  response: NewSessionResponse | ResumeSessionResponse;
  close: () => Promise<void>;
  readonly released: Promise<void>;
};

export type AcpOpenInput = {
  launch: DeferredAgentLaunch;
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
  authentication: (
    launch: DeferredAgentLaunch,
  ) => Promise<ConnectionAuthentication>;
  findAuthentication: (
    agent: string,
    projectId: string,
  ) => Promise<ConnectionAuthentication> | undefined;
  authChanges: Pick<AuthChanges, 'watch'>;
  dropAgentConnections: (agentId: string) => void;
  isDirectoryInUse: (directory: string) => boolean;
  open: (input: AcpOpenInput) => Promise<AcpSessionLease>;
  shutdown: () => Promise<void>;
};
