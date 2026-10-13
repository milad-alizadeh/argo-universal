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
  const metadata = currentModelMetadata(model);
  if (!modelSupportsEffort(metadata)) return [];
  return offeredEffortChoices(option, metadata?.supportedEffortLevels);
}
function currentModelMetadata(
  model?: SelectConfiguration,
):
  | NonNullable<NonNullable<SessionConfigSelectOption['_meta']>['argo']>
  | undefined {
  const current = currentConfigurationChoice(model);
  if (!current) return undefined;
  return current._meta?.argo;
}
function offeredEffortChoices(
  option: SelectConfiguration | undefined,
  levels?: string[],
): SessionConfigSelectOption[] {
  return configurationChoices(option).filter(
    (choice) => !levels || levels.includes(choice.value),
  );
}

export function currentConfigurationChoice(
  option?: SelectConfiguration,
  choices: SessionConfigSelectOption[] = configurationChoices(option),
): SessionConfigSelectOption | undefined {
  return choices.find((choice) => choice.value === option?.currentValue);
}

function modelSupportsEffort(
  metadata: ReturnType<typeof currentModelMetadata>,
): boolean {
  return metadata?.supportsEffort !== false;
}
