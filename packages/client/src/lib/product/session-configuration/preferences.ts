import {
  configurationChoices,
  configurationEffortChoices,
  isModelOption,
  startingCategories,
  startingCategory,
  type SessionConfigOption,
  type SessionConfigSelectOption,
  type StartingCategory as Category,
} from '@repo/contracts';

export type SavedChoices = Partial<Record<Category, string>>;

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

export type RememberedOption = SelectOption & { category: Category };

export function isRememberedConfiguration(
  option: SessionConfigOption,
): option is RememberedOption {
  return option.type === 'select' && startingCategory(option) !== undefined;
}

function orderedOptions(options: SessionConfigOption[]): RememberedOption[] {
  const eligible = options.filter(isRememberedConfiguration);

  return startingCategories.flatMap((category) =>
    eligible.filter((option) => option.category === category),
  );
}

function withSavedChoice(
  option: RememberedOption,
  saved: SavedChoices,
  offered: SessionConfigSelectOption[] = configurationChoices(option),
): RememberedOption | undefined {
  const value = [
    saved[option.category],
    option.currentValue,
    firstChoice(offered),
  ].find((candidate) => offered.some((choice) => choice.value === candidate));

  return value === undefined ? undefined : { ...option, currentValue: value };
}

// The model, effort and mode a new Session starts with: each saved choice the Session still offers, else its default, else its first offered value.
export function draftConfiguration(
  options: SessionConfigOption[],
  saved: SavedChoices,
): RememberedOption[] {
  const defaults = orderedOptions(options);
  const defaultModel = defaults.find(isModelOption);
  const model = savedModel(defaultModel, saved);

  return defaults.flatMap(
    (option) =>
      withSavedChoice(option, saved, offeredChoices(option, model)) ?? [],
  );
}

function savedModel(
  model: RememberedOption | undefined,
  saved: SavedChoices,
): RememberedOption | undefined {
  return model && withSavedChoice(model, saved);
}

function firstChoice(choices: SessionConfigSelectOption[]): string | undefined {
  return choices[0]?.value;
}

function offeredChoices(
  option: RememberedOption,
  model: RememberedOption | undefined,
): SessionConfigSelectOption[] {
  return startingCategory(option) === 'thought_level'
    ? configurationEffortChoices(model, option)
    : configurationChoices(option);
}
