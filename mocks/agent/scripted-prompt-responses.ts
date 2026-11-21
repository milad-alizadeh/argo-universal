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
  block.type === 'text' && !assistantContext(block.annotations?.audience)
    ? block.text
    : '';

const assistantContext = (
  audience: readonly string[] | null | undefined,
): boolean =>
  Boolean(audience?.includes('assistant') && !audience.includes('user'));

const promptText = (params: Params): string =>
  'prompt' in params && Array.isArray(params.prompt)
    ? params.prompt.map(text).join('\n')
    : '';

// Match the current request's text, leaving out any context supplied for the Agent.
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
