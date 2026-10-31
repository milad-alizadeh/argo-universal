import {
  RequestError,
  type AgentRequestMethod,
  type AgentRequestParamsByMethod,
  type AgentRequestResponsesByMethod,
  type AgentRequestContext,
  type CancelNotification,
  type PromptResponse,
  type JsonRpcId,
  type ErrorResponse,
} from '@agentclientprotocol/sdk';
import {
  keyedResponse,
  sessionIdOf,
  unkeyed,
} from './scripted-prompt-responses.ts';
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
  error?: string | ErrorResponse;
  sessionId?: string;
  // Plays only for a prompt containing this text; the other responses play the rest, in sequence.
  prompt?: string;
  steps?: readonly ScriptedStep[];
  waitFor?: Promise<void>;
  received?: { resolve: (params: AgentRequestParamsByMethod[Method]) => void };
  requests?: { push: (params: AgentRequestParamsByMethod[Method]) => void };
};

export type ScriptedResponses = {
  [Method in AgentRequestMethod]?: readonly ScriptedResponse<Method>[];
};

export type ScriptedNotifications = {
  'session/cancel'?: {
    received?: { resolve: (params: CancelNotification) => void };
    requests?: { push: (params: CancelNotification) => void };
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

  return (params) => selectResponse({ responses, positions, params });
};

type ResponseSelection<Method extends AgentRequestMethod> = {
  responses: readonly ScriptedResponse<Method>[];
  positions: Map<string, number>;
  params: AgentRequestParamsByMethod[Method];
};

const selectResponse = <Method extends AgentRequestMethod>({
  responses,
  positions,
  params,
}: ResponseSelection<Method>): ScriptedResponse<Method> | undefined => {
  const sessionId = sessionIdOf(params);
  const keyed = keyedResponse(responses, params);

  if (keyed) return keyed;

  const matched = unkeyed(responses).filter(
    (response) => !response.sessionId || response.sessionId === sessionId,
  );

  const position = positions.get(sessionId) ?? 0;
  positions.set(sessionId, position + 1);

  return matched[Math.min(position, matched.length - 1)];
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
  observeResponse(response, context.params);
  const selected = response ?? {};
  const { stopReason } = await runTurn(selected.steps ?? [], turn);
  await selected.waitFor;

  return finishResponse({ response, context, turn }, stopReason);
};

const responseError = (
  error: NonNullable<ScriptedResponse<AgentRequestMethod>['error']>,
): RequestError => {
  if (typeof error === 'string')
    return RequestError.internalError(undefined, error);

  return new RequestError(error.code, error.message, error.data);
};

const observeResponse = <Method extends AgentRequestMethod>(
  response: Pick<ScriptedResponse<Method>, 'requests' | 'received'> | undefined,
  params: AgentRequestParamsByMethod[Method],
): void => {
  if (!response) return;
  response.requests?.push(params);
  observeReceived(response, params);
};

type ResponsePlayback<Method extends AgentRequestMethod> = {
  response: ScriptedResponse<Method> | undefined;
  context: AgentRequestContext<AgentRequestParamsByMethod[Method]>;
  turn: ScriptedTurn;
};

type PlayedResponse<Method extends AgentRequestMethod> = {
  result: AgentRequestResponsesByMethod[Method] | undefined;
  stopReason: PromptResponse['stopReason'];
};

const finishResponse = async <Method extends AgentRequestMethod>(
  { response, context, turn }: ResponsePlayback<Method>,
  stopReason: PromptResponse['stopReason'],
): Promise<PlayedResponse<Method>> => {
  if (!response) return { result: undefined, stopReason };
  rejectResponseError(response);

  if ('rawResult' in response) return deliverRawResult(response, context, turn);

  return { result: await response.result, stopReason };
};

const rejectResponseError = <Method extends AgentRequestMethod>(
  response: Pick<ScriptedResponse<Method>, 'error'>,
): void => {
  if (response.error) throw responseError(response.error);
};

const observeReceived = <Method extends AgentRequestMethod>(
  response: Pick<ScriptedResponse<Method>, 'received'>,
  params: AgentRequestParamsByMethod[Method],
): void => {
  response.received?.resolve(params);
};
