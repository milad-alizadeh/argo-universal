import {
  RequestError,
  type AgentContext,
  type CreateElicitationRequest,
  type InitializeResponse,
  type PromptResponse,
  type RequestPermissionRequest,
  type SessionConfigOption,
  type SessionUpdate,
} from '@agentclientprotocol/sdk';

// Node runs the stdio entry without a build, so this file imports only the SDK.

type FormElicitation = Omit<
  Extract<CreateElicitationRequest, { mode: 'form'; sessionId: string }>,
  'sessionId'
>;

// One step of a prompt; the Agent fills in the Session's own id.
export type ScriptedStep =
  | { type: 'update'; update: SessionUpdate }
  | {
      type: 'permission';
      request: Omit<RequestPermissionRequest, 'sessionId'>;
    }
  | { type: 'elicitation'; request: FormElicitation }
  | { type: 'wait-for-cancel' }
  // Ignores cancellation until the connection closes.
  | { type: 'hold' }
  | { type: 'fail'; message: string }
  // Bypasses the SDK's encoder, so frames the SDK would refuse still reach the Client.
  | { type: 'raw'; frame: string };

export type ScriptedScenario = {
  initialize?: InitializeResponse;
  configOptions?: readonly SessionConfigOption[];
  steps: readonly ScriptedStep[];
};

export const scriptedInitialization: InitializeResponse = {
  protocolVersion: 1,
  agentCapabilities: {
    promptCapabilities: { image: true },
    loadSession: true,
    sessionCapabilities: { close: {}, resume: {} },
  },
};

export type ScriptedTurn = {
  sessionId: string;
  client: AgentContext;
  cancelled: Promise<void>;
  isCancelled: () => boolean;
  writeRaw: (frame: string) => Promise<void>;
  closed: Promise<void>;
};

const runStep = async (
  step: ScriptedStep,
  turn: ScriptedTurn,
): Promise<void> => {
  const { sessionId, client } = turn;
  switch (step.type) {
    case 'update':
      return client.notify('session/update', {
        sessionId,
        update: step.update,
      });
    case 'permission':
      await client.request('session/request_permission', {
        ...step.request,
        sessionId,
      });
      return;
    case 'elicitation':
      await client.request('elicitation/create', {
        ...step.request,
        sessionId,
      });
      return;
    case 'wait-for-cancel':
      return turn.cancelled;
    case 'hold':
      return turn.closed;
    case 'fail':
      throw RequestError.internalError(undefined, step.message);
    case 'raw':
      return turn.writeRaw(step.frame);
  }
};

export const runTurn = async (
  steps: readonly ScriptedStep[],
  turn: ScriptedTurn,
): Promise<PromptResponse> => {
  for (const step of steps) {
    await runStep(step, turn);
    if (turn.isCancelled()) return { stopReason: 'cancelled' };
  }
  return { stopReason: 'end_turn' };
};
