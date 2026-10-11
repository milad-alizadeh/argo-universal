import type { AgentConfigValue } from '@repo/agents';
import type { SessionConfigOption } from '@repo/contracts';

export const toConfigValues = (
  configOptions: SessionConfigOption[],
): AgentConfigValue[] =>
  configOptions.map((option): AgentConfigValue => ({
    configId: option.configId,
    value: option.currentValue,
  }));

export const currentModel = (
  configOptions: SessionConfigOption[],
): string | null => {
  const model = configOptions.find(
    (option): boolean => option.category === 'model',
  );
  return model?.type === 'select' ? model.currentValue : null;
};

const configChoiceMetadata = (
  option: SessionConfigOption,
  held: boolean,
): SessionConfigOption['_meta'] => ({
  ...option._meta,
  argo: { ...option._meta?.argo, heldUntilNextTurn: held },
});

const chooseBooleanValue = (
  option: Extract<SessionConfigOption, { type: 'boolean' }>,
  value: AgentConfigValue['value'],
  _meta: SessionConfigOption['_meta'],
): SessionConfigOption =>
  typeof value === 'boolean'
    ? { ...option, currentValue: value, _meta }
    : option;

const updateConfigChoice = (
  option: SessionConfigOption,
  choice: AgentConfigValue,
  held: boolean,
): SessionConfigOption => {
  const _meta = configChoiceMetadata(option, held);
  if (option.type === 'boolean')
    return chooseBooleanValue(option, choice.value, _meta);
  return typeof choice.value === 'string'
    ? { ...option, currentValue: choice.value, _meta }
    : option;
};

export function chooseConfigValue(
  options: SessionConfigOption[],
  choice: AgentConfigValue,
  held: boolean,
): SessionConfigOption[] {
  return options.map((option): SessionConfigOption => {
    if (option.configId !== choice.configId) return option;
    return updateConfigChoice(option, choice, held);
  });
}

export function keepHeldConfigChoices(
  options: SessionConfigOption[],
  held: AgentConfigValue[],
): SessionConfigOption[] {
  return held.reduce(
    (current, choice): SessionConfigOption[] =>
      chooseConfigValue(current, choice, true),
    options,
  );
}

// A choice made during a Turn waits for the next Turn; a later choice for the same setting replaces it.
export function holdConfigChoice(
  held: readonly AgentConfigValue[],
  choice: AgentConfigValue,
): AgentConfigValue[] {
  return held.some((value): boolean => value.configId === choice.configId)
    ? held.map((value): AgentConfigValue =>
        value.configId === choice.configId ? choice : value,
      )
    : [...held, choice];
}

export function releaseHeldChoice(
  held: readonly AgentConfigValue[],
  configId: AgentConfigValue['configId'],
): AgentConfigValue[] {
  return held.filter((choice): boolean => choice.configId !== configId);
}
