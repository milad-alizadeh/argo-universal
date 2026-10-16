import type {
  AgentContext,
  CreateTerminalRequest,
  CreateElicitationRequest,
  InitializeResponse,
  RequestPermissionRequest,
  SessionConfigOption,
  SessionUpdate,
  RequestPermissionResponse,
  CreateElicitationResponse,
  JsonRpcId,
} from '@agentclientprotocol/sdk';
import type {
  ScriptedResponses,
  ScriptedNotifications,
} from './scripted-responses.ts';

type SessionElicitation =
  | Omit<
      Extract<CreateElicitationRequest, { mode: 'form'; sessionId: string }>,
      'sessionId'
    >
  | Omit<
      Extract<CreateElicitationRequest, { mode: 'url'; sessionId: string }>,
      'sessionId'
    >;

export type ScriptedStep =
  | {
      type: 'terminal';
      request: Omit<CreateTerminalRequest, 'sessionId'>;
      toolCallId: string;
      completion: 'leave-running' | 'wait-for-exit' | 'kill';
    }
  | { type: 'update'; update: SessionUpdate; sessionId?: string }
  | {
      type: 'permission';
      request: Omit<RequestPermissionRequest, 'sessionId'>;
      responses?: RequestPermissionResponse[];
      detached?: boolean;
      signal?: AbortSignal;
    }
  | {
      type: 'elicitation';
      request: SessionElicitation;
      responses?: CreateElicitationResponse[];
      detached?: boolean;
      signal?: AbortSignal;
    }
  | { type: 'wait-for-cancel'; until?: Promise<void> }
  | {
      type: 'request-elicitation';
      request: Omit<
        Extract<
          CreateElicitationRequest,
          { mode: 'url'; requestId: JsonRpcId }
        >,
        'requestId'
      >;
      responses?: CreateElicitationResponse[];
      signal?: AbortSignal;
    }
  | { type: 'gate'; waitFor: Promise<void>; entered?: { resolve: () => void } }
  | { type: 'yield' }
  | { type: 'parallel'; steps: readonly ScriptedStep[] }
  | { type: 'exit'; code: number; stderr: string }
  | { type: 'hold' }
  | { type: 'fail'; message: string }
  | { type: 'raw'; frame: string };

export type ScriptedCredentials = { signedIn: boolean };

export type ScriptedScenario = {
  /*
   * The Agent's stored sign-in, shared like a real Agent's credentials: every
   * scripted Agent given the same store sees one sign-in. `session/new` needs
   * auth until it is signed in.
   */
  authentication?: { credentials: ScriptedCredentials };
  initialize?: InitializeResponse;
  configOptions?: readonly SessionConfigOption[];
  steps: readonly ScriptedStep[];
  resumedSteps?: readonly ScriptedStep[];
  // In App E2E, an Agent process started again after this scenario's process failed plays this one.
  relaunched?: ScriptedScenario;
  responses?: ScriptedResponses;
  notifications?: ScriptedNotifications;
  sessionIds?: readonly string[];
};

export type ScriptedTurn = {
  sessionId: string;
  client: AgentContext;
  cancelled: Promise<void>;
  isCancelled: () => boolean;
  writeRaw: (frame: string) => Promise<void>;
  closed: Promise<void>;
  exit: (code: number, stderr: string) => Promise<void>;
  requestId?: JsonRpcId;
};
