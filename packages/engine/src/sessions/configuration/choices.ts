import {
  configurationChoices,
  isModelOption,
  startingRank,
  type SessionConfigOption,
  type SessionSetConfigOptionInput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionContext } from '../session-context';

// One choice of value for one of the Agent's options.
export type AgentConfigValue = Pick<
  SessionSetConfigOptionInput,
  'configId' | 'value'
>;

const pendingConfigurationLimit = 32;

const findOption = (
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
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `The Agent did not offer ${choice.configId}=${String(choice.value)}`,
    });
}

// Whether the Agent already runs with this choice.
export const hasChoice = (
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): boolean =>
  findOption(options, choice.configId)?.currentValue === choice.value;

// A Session queues and holds at most 32 choices at once.
export const hasConfigurationCapacity = (
  context: Pick<SessionContext, 'configQueue' | 'heldConfig'>,
): boolean =>
  context.configQueue.length + context.heldConfig.length <
  pendingConfigurationLimit;

const rankOf = (
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): number => startingRank(findOption(options, choice.configId) ?? choice);

// Takes the next choice in Starting choices order, read against the options the Agent offers now.
export function takeNextChoice(
  pending: AgentConfigValue[],
  options: readonly SessionConfigOption[],
): AgentConfigValue | undefined {
  pending.sort((left, right) => rankOf(options, left) - rankOf(options, right));

  return pending.shift();
}

export const toConfigValues = (
  options: SessionConfigOption[],
): AgentConfigValue[] =>
  options.map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));

export const currentModel = (options: SessionConfigOption[]): string | null => {
  const model = options.find(isModelOption);

  return model?.type === 'select' ? model.currentValue : null;
};
