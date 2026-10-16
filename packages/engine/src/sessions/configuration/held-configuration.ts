import type {
  SessionConfigOption,
  SessionSetConfigOptionInput,
} from '@repo/contracts';

export type HeldConfigChoice = Pick<
  SessionSetConfigOptionInput,
  'configId' | 'value'
>;

const heldBoolean = (
  option: Extract<SessionConfigOption, { type: 'boolean' }>,
  value: HeldConfigChoice['value'],
): SessionConfigOption =>
  typeof value === 'boolean' ? { ...option, currentValue: value } : option;

const heldSelect = (
  option: Extract<SessionConfigOption, { type: 'select' }>,
  value: HeldConfigChoice['value'],
): SessionConfigOption =>
  typeof value === 'string' ? { ...option, currentValue: value } : option;

const heldValue = (
  option: SessionConfigOption,
  value: HeldConfigChoice['value'],
): SessionConfigOption =>
  option.type === 'boolean'
    ? heldBoolean(option, value)
    : heldSelect(option, value);

const heldOption = (
  option: SessionConfigOption,
  choice: HeldConfigChoice | undefined,
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

export const withHeldConfiguration = (
  options: SessionConfigOption[],
  held: readonly HeldConfigChoice[],
): SessionConfigOption[] =>
  options.map((option) =>
    heldOption(
      option,
      held.find(({ configId }) => configId === option.configId),
    ),
  );

export const withoutHeldChoice = (
  held: HeldConfigChoice[],
  choice: HeldConfigChoice | null,
): HeldConfigChoice[] => {
  if (!choice) return held;

  return held.filter(
    (candidate) =>
      candidate.configId !== choice.configId ||
      candidate.value !== choice.value,
  );
};
