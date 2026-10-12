import {
  RequestError,
  type InitializeResponse,
  type PromptResponse,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';
export type {
  ScriptedStep,
  ScriptedScenario,
  ScriptedTurn,
} from './scripted-types.ts';

export const scriptedInitialization: InitializeResponse = {
  protocolVersion: 1,
  agentCapabilities: {
    promptCapabilities: { image: true },
    loadSession: true,
    sessionCapabilities: { close: {}, resume: {} },
    _meta: { authStatus: {} },
  },
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
    case 'request-elicitation':
      if (turn.requestId == null)
        throw new Error('Missing scripted request scope');
      return observeQuestion(
        client.request(
          'elicitation/create',
          {
            ...step.request,
            requestId: turn.requestId,
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
