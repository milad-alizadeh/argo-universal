import type { SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from './choices';

const heldBoolean = (
  option: Extract<SessionConfigOption, { type: 'boolean' }>,
  value: AgentConfigValue['value'],
): SessionConfigOption =>
  typeof value === 'boolean' ? { ...option, currentValue: value } : option;

const heldSelect = (
  option: Extract<SessionConfigOption, { type: 'select' }>,
  value: AgentConfigValue['value'],
): SessionConfigOption =>
  typeof value === 'string' ? { ...option, currentValue: value } : option;

const heldValue = (
  option: SessionConfigOption,
  value: AgentConfigValue['value'],
): SessionConfigOption =>
  option.type === 'boolean'
    ? heldBoolean(option, value)
    : heldSelect(option, value);

const heldOption = (
  option: SessionConfigOption,
  choice: AgentConfigValue | undefined,
): SessionConfigOption => {
  if (!choice) return option;

  return {
    ...heldValue(option, choice.value),
    _meta: {
      ...option._meta,
      argo: { ...option._meta?.argo, heldUntilNextTurn: true },
    },
  };
};

// A held choice shows as the option's value, marked as waiting for the next Turn.
export const withHeldConfiguration = (
  options: SessionConfigOption[],
  held: readonly AgentConfigValue[],
): SessionConfigOption[] =>
  options.map((option) =>
    heldOption(
      option,
      held.find(({ configId }) => configId === option.configId),
    ),
  );

export const withoutHeldChoice = (
  held: AgentConfigValue[],
  choice: AgentConfigValue | null,
): AgentConfigValue[] => {
  if (!choice) return held;

  return held.filter(
    (candidate) =>
      candidate.configId !== choice.configId ||
      candidate.value !== choice.value,
  );
};
