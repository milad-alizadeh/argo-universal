import type { PromptRequest } from '@agentclientprotocol/sdk';

export function fulfilled<T>(
  results: PromiseSettledResult<T>[],
): PromiseFulfilledResult<T> {
  const result = results.find(
    (item): item is PromiseFulfilledResult<T> => item.status === 'fulfilled',
  );

  if (!result) throw new Error('No prompt was acknowledged');

  return result;
}

export const admittedPrompt = <T>(
  results: PromiseSettledResult<T>[],
  first: PromptRequest['prompt'],
  second: PromptRequest['prompt'],
): PromptRequest['prompt'] =>
  results[0]?.status === 'fulfilled' ? first : second;
