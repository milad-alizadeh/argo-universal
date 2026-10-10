import {
  RequestError,
  type AgentContext,
  type CreateElicitationRequest,
  type InitializeResponse,
  type PromptResponse,
  type RequestPermissionRequest,
  type SessionConfigOption,
  type SessionUpdate,
  type RequestPermissionResponse,
  type CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import type {
  ScriptedResponses,
  ScriptedNotifications,
} from './scripted-responses.ts';

// Node runs the stdio entry without a build, so this file imports only the SDK.

type SessionElicitation =
  | Omit<
      Extract<CreateElicitationRequest, { mode: 'form'; sessionId: string }>,
      'sessionId'
    >
  | Omit<
      Extract<CreateElicitationRequest, { mode: 'url'; sessionId: string }>,
      'sessionId'
    >;

// One step of a prompt; the Agent fills in the Session's own id.
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
  | { type: 'gate'; waitFor: Promise<void>; entered?: { resolve: () => void } }
  | { type: 'yield' }
  | { type: 'parallel'; steps: readonly ScriptedStep[] }
  // Ignores cancellation until the connection closes.
  | { type: 'hold' }
  | { type: 'fail'; message: string }
  // Bypasses the SDK's encoder, so frames the SDK would refuse still reach the Client.
  | { type: 'raw'; frame: string };

export type ScriptedScenario = {
  initialize?: InitializeResponse;
  configOptions?: readonly SessionConfigOption[];
  steps: readonly ScriptedStep[];
  responses?: ScriptedResponses;
  notifications?: ScriptedNotifications;
  sessionIds?: readonly string[];
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
        sessionId: step.sessionId ?? sessionId,
        update: step.update,
      });
    case 'permission':
      return observeQuestion(
        client.request(
          'session/request_permission',
          {
            ...step.request,
            sessionId,
          },
          step.signal ? { cancellationSignal: step.signal } : undefined,
        ),
        step,
      );
    case 'elicitation':
      return observeQuestion(
        client.request(
          'elicitation/create',
          {
            ...step.request,
            sessionId,
          },
          step.signal ? { cancellationSignal: step.signal } : undefined,
        ),
        step,
      );
    case 'wait-for-cancel':
      return step.until
        ? Promise.race([turn.cancelled, step.until])
        : turn.cancelled;
    case 'gate':
      step.entered?.resolve();
      return step.waitFor;
    case 'parallel':
      await Promise.all(step.steps.map((parallel) => runStep(parallel, turn)));
      return;
    case 'yield':
      return new Promise((resolve) => setTimeout(resolve, 0));
    case 'hold':
      return turn.closed;
    case 'fail':
      throw RequestError.internalError(undefined, step.message);
    case 'raw':
      return turn.writeRaw(step.frame.replaceAll('$sessionId', sessionId));
  }
};

export const runTurn = async (
  steps: readonly ScriptedStep[],
  turn: ScriptedTurn,
): Promise<PromptResponse> => {
  for (const step of steps) {
    await runStep(step, turn);
  }
  return { stopReason: turn.isCancelled() ? 'cancelled' : 'end_turn' };
};

const observeQuestion = async <Response>(
  pending: Promise<Response>,
  step: { responses?: Response[]; detached?: boolean },
): Promise<void> => {
  const observed = pending.then((response) => {
    step.responses?.push(response);
  });
  if (step.detached) {
    void observed.catch(() => {});
    return;
  }
  await observed;
};
