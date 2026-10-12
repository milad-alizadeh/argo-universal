import type {
  AgentContext,
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
  | { type: 'hold' }
  | { type: 'fail'; message: string }
  | { type: 'raw'; frame: string };

export type ScriptedScenario = {
  initialize?: InitializeResponse;
  configOptions?: readonly SessionConfigOption[];
  steps: readonly ScriptedStep[];
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
  requestId?: JsonRpcId;
};
