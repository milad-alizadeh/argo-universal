import {
  configurationChoices,
  type SessionConfigOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { AgentConfigValue } from './values';

// A choice the Agent does not offer: the caller's mistake, a bad request, wherever the Session finds it.
class ChoiceNotOffered extends TRPCError {
  constructor(message: string) {
    super({ code: 'BAD_REQUEST', message });
  }
}

export const findOption = (
  options: readonly SessionConfigOption[],
  configId: string,
): SessionConfigOption | undefined =>
  options.find((option): boolean => option.configId === configId);

const offersValue = (
  option: SessionConfigOption,
  value: AgentConfigValue['value'],
): boolean =>
  option.type === 'boolean'
    ? typeof value === 'boolean'
    : configurationChoices(option).some((choice) => choice.value === value);

export const isOfferedConfigChoice = (
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): boolean => {
  const option = findOption(options, choice.configId);

  return option !== undefined && offersValue(option, choice.value);
};

export function requireOfferedChoice(
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): void {
  if (!isOfferedConfigChoice(options, choice))
    throw new ChoiceNotOffered(
      `The Agent did not offer ${choice.configId}=${String(choice.value)}`,
    );
}

// Whether the Agent already runs with this choice.
export const hasChoice = (
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): boolean =>
  findOption(options, choice.configId)?.currentValue === choice.value;
