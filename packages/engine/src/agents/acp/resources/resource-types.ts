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
import type { UsageLimits } from '../../usage-limits';
import type { TerminalRequests } from '../connection/terminal-requests';

// ACP's `systemPrompt` on session/new, resume and load, which the SDK this Engine builds on does not type yet.
export type AcpSystemPrompt = {
  mode: 'append';
  content: [{ type: 'text'; text: string }];
};

type WithSystemPrompt = { systemPrompt?: AcpSystemPrompt };

export type AcpSessionOpening =
  | { method: 'session/new'; params: NewSessionRequest & WithSystemPrompt }
  | {
      method: 'session/resume';
      params: ResumeSessionRequest & WithSystemPrompt;
    };

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
  connectionKind: EntryKind['kind'];
  authentication?: ConnectionAuthentication;
  agent: ClientContext;
  sessionId: SessionId;
  initialization: InitializeResponse;
  steering?: boolean;
  refreshUsage: (reason: 'open' | 'turn') => void;
  response: NewSessionResponse | ResumeSessionResponse;
  // A private connection's answer to whether its Agent loaded Argo's tools; a shared one gives none.
  argoTools?: () => ArgoToolsState;
  close: () => Promise<void>;
  // Rethrows a request's failure once a connection closure behind it has reached the Session.
  rejectRequest: (cause: unknown) => Promise<never>;
  readonly released: Promise<void>;
};

// What one connection opens; the resources add which kind of connection it runs on.
export type AcpConnectionLease = Omit<AcpSessionLease, 'connectionKind'>;

// Whether a Session's Agent started `argo mcp`: it has, it may still, or it had its grace and did not.
export type ArgoToolsState = 'loaded' | 'waiting' | 'missing';

// What a Session's token grant gives its Agent process besides the environment.
export type AccessGrant = {
  release: () => void;
  argoTools?: () => ArgoToolsState;
};

export type SessionProcessAccess = AccessGrant & {
  environment: NonNullable<AgentLaunch['sessionAccess']>;
};

// A private connection is one Session's own Agent process, holding that Session's access; a shared one serves its Agent and Project.
export type EntryKind =
  | { kind: 'shared' }
  | { kind: 'private'; access: SessionProcessAccess };

export type AcpOpenInput = {
  sessionId?: string;
  discardOnClose?: true;
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
  sessionAccess?: (
    sessionId: string,
    projectId: string,
  ) => SessionProcessAccess | undefined;
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
  usageLimits: Pick<UsageLimits, 'read' | 'watch'>;
  dropAgentConnections: (agentId: string) => void;
  isDirectoryInUse: (directory: string) => boolean;
  open: (input: AcpOpenInput) => Promise<AcpSessionLease>;
  shutdown: () => Promise<void>;
};
