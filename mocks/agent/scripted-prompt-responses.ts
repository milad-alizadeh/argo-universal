import type {
  AgentRequestMethod,
  AgentRequestParamsByMethod,
  ContentBlock,
} from '@agentclientprotocol/sdk';

type Params = AgentRequestParamsByMethod[AgentRequestMethod];

type PromptKeyed = { prompt?: string };

export const sessionIdOf = (params: Params): string =>
  'sessionId' in params ? String(params['sessionId']) : '';

const text = (block: ContentBlock): string =>
  block.type === 'text' ? block.text : '';

const promptText = (params: Params): string =>
  'prompt' in params && Array.isArray(params.prompt)
    ? params.prompt.map(text).join('\n')
    : '';

// The response keyed to this prompt's text; it plays however many prompts came before.
export const keyedResponse = <Response extends PromptKeyed>(
  responses: readonly Response[],
  params: Params,
): Response | undefined =>
  responses.find(
    ({ prompt }) => prompt !== undefined && promptText(params).includes(prompt),
  );

// The responses that play in sequence: those not keyed to a prompt.
export const unkeyed = <Response extends PromptKeyed>(
  responses: readonly Response[],
): Response[] => responses.filter(({ prompt }) => prompt === undefined);
