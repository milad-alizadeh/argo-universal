import type { AgentConfigValue } from '@repo/agents';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';

const pendingConfigurationLimit = 32;

const listedChoices = (
  option: Extract<SessionConfigOption, { type: 'select' }>,
): SessionConfigSelectOption[] =>
  option.options.flatMap((choice): SessionConfigSelectOption[] =>
    'groupId' in choice ? choice.options : [choice],
  );

const offersValue = (
  option: SessionConfigOption,
  value: AgentConfigValue['value'],
): boolean =>
  option.type === 'boolean'
    ? typeof value === 'boolean'
    : listedChoices(option).some((choice): boolean => choice.value === value);

export const isOfferedConfigChoice = (
  configOptions: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): boolean => {
  const option = configOptions.find(
    (candidate): boolean => candidate.configId === choice.configId,
  );
  return option !== undefined && offersValue(option, choice.value);
};

export const hasConfigurationCapacity = (queuedChoices: number): boolean =>
  queuedChoices < pendingConfigurationLimit;
