import type {
  AgentRequestMethod,
  AgentRequestParamsByMethod,
  AgentRequestResponsesByMethod,
  PromptResponse,
  JsonRpcId,
} from '@agentclientprotocol/sdk';
import type { ScriptedResponse } from './scripted-responses.ts';
import type { ScriptedScenario, ScriptedTurn } from './scripted-types.ts';

export const responseSessionId = <Method extends AgentRequestMethod>(
  response: ScriptedResponse<Method> | undefined,
  params: AgentRequestParamsByMethod[Method],
  fallback: AgentRequestResponsesByMethod[Method],
): string => {
  const result = responseResult(response, fallback);
  if ('sessionId' in result) return String(result.sessionId);
  if ('sessionId' in params) return String(params['sessionId']);
  return '';
};

export const completeResponse = <Response extends object>(
  fallback: Response,
  stopReason: PromptResponse['stopReason'],
): Response => {
  if ('stopReason' in fallback) return { ...fallback, stopReason };
  return fallback;
};

export const requestScope = (
  requestId: JsonRpcId | undefined,
): Pick<ScriptedTurn, 'requestId'> =>
  requestId === undefined ? {} : { requestId };
const responseResult = <Method extends AgentRequestMethod>(
  response: ScriptedResponse<Method> | undefined,
  fallback: AgentRequestResponsesByMethod[Method],
):
  | AgentRequestResponsesByMethod[Method]
  | Promise<AgentRequestResponsesByMethod[Method]> =>
  response?.result ?? fallback;
export const promptSteps = <Method extends AgentRequestMethod>(
  response: ScriptedResponse<Method> | undefined,
  steps: ScriptedScenario['steps'],
): ScriptedScenario['steps'] => response?.steps ?? steps;
