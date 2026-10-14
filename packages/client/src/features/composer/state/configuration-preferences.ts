import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import {
  configurationChoices,
  configurationEffortChoices,
} from './configuration-choices';

export const categories = ['model', 'thought_level', 'mode'] as const;

type Category = (typeof categories)[number];

export type SavedChoices = Partial<Record<Category, string>>;

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

export type RememberedOption = SelectOption & { category: Category };

export interface ConfigurationChange {
  configId: string;
  value: string;
}

export function isRememberedConfiguration(
  option: SessionConfigOption,
): option is RememberedOption {
  return (
    option.type === 'select' &&
    categories.some((category) => category === option.category)
  );
}

export function orderedOptions(
  options: SessionConfigOption[],
): RememberedOption[] {
  const eligible = options.filter(isRememberedConfiguration);

  return categories.flatMap((category) =>
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
  const defaultModel = defaults.find((option) => option.category === 'model');
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
  return option.category === 'thought_level'
    ? configurationEffortChoices(model, option)
    : configurationChoices(option);
}

// The next saved choice to apply to a Session, model before effort before mode; each option is applied at most once.
export function nextRememberedChange(
  options: SessionConfigOption[],
  saved: SavedChoices,
  applied: readonly string[],
): ConfigurationChange | undefined {
  const current = orderedOptions(options);

  return draftConfiguration(options, saved)
    .filter(({ configId }) => !applied.includes(configId))
    .map(({ configId, currentValue }) => ({ configId, value: currentValue }))
    .find((change) => differsFromSession(current, change));
}

function differsFromSession(
  current: RememberedOption[],
  { configId, value }: ConfigurationChange,
): boolean {
  return current.some(
    (option) => option.configId === configId && option.currentValue !== value,
  );
}
