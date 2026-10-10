import {
  RequestError,
  type AgentRequestMethod,
  type AgentRequestParamsByMethod,
  type AgentRequestResponsesByMethod,
  type AgentRequestContext,
  type CancelNotification,
  type PromptResponse,
  type JsonRpcId,
} from '@agentclientprotocol/sdk';
import {
  runTurn,
  type ScriptedStep,
  type ScriptedTurn,
} from './scripted-scenario.ts';

export type ScriptedResponse<Method extends AgentRequestMethod> = {
  result?:
    | AgentRequestResponsesByMethod[Method]
    | Promise<AgentRequestResponsesByMethod[Method]>;
  rawResult?: unknown;
  error?: string | { code: number; message: string; data?: unknown };
  sessionId?: string;
  steps?: readonly ScriptedStep[];
  waitFor?: Promise<void>;
  received?: { resolve: (params: AgentRequestParamsByMethod[Method]) => void };
  requests?: { push: (params: AgentRequestParamsByMethod[Method]) => unknown };
};
export type ScriptedResponses = {
  [Method in AgentRequestMethod]?: readonly ScriptedResponse<Method>[];
};
export type ScriptedNotifications = {
  'session/cancel'?: {
    received?: { resolve: (params: CancelNotification) => void };
    requests?: { push: (params: CancelNotification) => unknown };
  };
};

const sequencePositions = new WeakMap<object, Map<string, number>>();

export const responseSequence = <Method extends AgentRequestMethod>(
  responses: readonly ScriptedResponse<Method>[] = [],
): ((
  params: AgentRequestParamsByMethod[Method],
) => ScriptedResponse<Method> | undefined) => {
  const positions =
    sequencePositions.get(responses) ?? new Map<string, number>();
  sequencePositions.set(responses, positions);
  return (params) => {
    const sessionId = 'sessionId' in params ? String(params['sessionId']) : '';
    const matched = responses.filter(
      (response) => !response.sessionId || response.sessionId === sessionId,
    );
    const position = positions.get(sessionId) ?? 0;
    positions.set(sessionId, position + 1);
    return matched[Math.min(position, matched.length - 1)];
  };
};

const deliverRawResult = async (
  response: { rawResult?: unknown },
  context: { requestId: JsonRpcId },
  turn: ScriptedTurn,
): Promise<never> => {
  await turn.writeRaw(
    JSON.stringify({
      jsonrpc: '2.0',
      id: context.requestId,
      result: response.rawResult,
    }),
  );
  await turn.closed;
  throw RequestError.internalError(undefined, 'Raw response connection closed');
};

export const playResponse = async <Method extends AgentRequestMethod>(
  response: ScriptedResponse<Method> | undefined,
  context: AgentRequestContext<AgentRequestParamsByMethod[Method]>,
  turn: ScriptedTurn,
): Promise<{
  result: AgentRequestResponsesByMethod[Method] | undefined;
  stopReason: PromptResponse['stopReason'];
}> => {
  response?.requests?.push(context.params);
  response?.received?.resolve(context.params);
  const { stopReason } = await runTurn(response?.steps ?? [], turn);
  await response?.waitFor;
  if (response?.error) throw responseError(response.error);
  if (response && 'rawResult' in response)
    return deliverRawResult(response, context, turn);
  return { result: await response?.result, stopReason };
};

const responseError = (
  error: NonNullable<ScriptedResponse<AgentRequestMethod>['error']>,
): RequestError => {
  if (typeof error === 'string')
    return RequestError.internalError(undefined, error);
  return new RequestError(error.code, error.message, error.data);
};
