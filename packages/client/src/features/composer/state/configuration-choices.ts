import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;

// A select option's choices, with its groups flattened.
export function configurationChoices(
  option?: SelectConfiguration,
): SessionConfigSelectOption[] {
  return (
    option?.options.flatMap((entry) =>
      'groupId' in entry ? entry.options : [entry],
    ) ?? []
  );
}

// The effort levels the current model offers: none for a model without effort, every level when it names none.
export function configurationEffortChoices(
  model: SelectConfiguration | undefined,
  option: SelectConfiguration | undefined,
): SessionConfigSelectOption[] {
  const currentModel = configurationChoices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const levels = currentModel?._meta?.argo?.supportedEffortLevels;
  return currentModel?._meta?.argo?.supportsEffort === false
    ? []
    : configurationChoices(option).filter(
        (choice) => !levels || levels.includes(choice.value),
      );
}
