import {
  configurationChoices,
  startingRank,
  type InitialConfigOption,
  type SessionConfigOption,
} from '@repo/contracts';
import {
  draftConfiguration,
  isRememberedConfiguration,
  type SavedChoices,
} from '#lib/product/session-configuration';

// The reader's own choices in New Session, by configId, over the cached options.
export type ConfigurationPicks = Readonly<Record<string, string | boolean>>;

type BooleanOption = Extract<SessionConfigOption, { type: 'boolean' }>;

type SelectOption = Exclude<SessionConfigOption, BooleanOption>;

const withBoolean = (
  option: BooleanOption,
  value: string | boolean,
): BooleanOption =>
  typeof value === 'boolean' ? { ...option, currentValue: value } : option;

const withChoice = (
  option: SelectOption,
  value: string | boolean,
): SelectOption =>
  configurationChoices(option).some((choice) => choice.value === value)
    ? { ...option, currentValue: String(value) }
    : option;

// The option with the value when it still offers it.
const withValue = (
  option: SessionConfigOption,
  value: string | boolean | undefined,
): SessionConfigOption => {
  if (value === undefined) return option;

  return option.type === 'boolean'
    ? withBoolean(option, value)
    : withChoice(option, value);
};

// Project unsent model, effort and mode picks through the product rules.
function pickedStartingChoices(
  options: SessionConfigOption[],
  picks: ConfigurationPicks,
): SavedChoices {
  const picked = options.flatMap((option) => {
    const value = picks[option.configId];

    return isRememberedConfiguration(option) && typeof value === 'string'
      ? [[option.category, value]]
      : [];
  });

  return Object.fromEntries(picked);
}

// Unsent model, effort and mode choices follow the selected model.
const rememberedValues = (
  options: SessionConfigOption[],
  picked: SavedChoices,
): Map<string, string> =>
  new Map(
    draftConfiguration(options, picked).map(({ configId, currentValue }) => [
      configId,
      currentValue,
    ]),
  );

// Apply unsent picks only while the Agent still offers them.
export function chosenOptions(
  options: SessionConfigOption[],
  picks: ConfigurationPicks,
): SessionConfigOption[] {
  const remembered = rememberedValues(
    options,
    pickedStartingChoices(options, picks),
  );

  const value = (option: SessionConfigOption): string | boolean | undefined =>
    isRememberedConfiguration(option)
      ? remembered.get(option.configId)
      : picks[option.configId];

  return options.map((option) => withValue(option, value(option)));
}

// The choices a Session is opened with, model before effort before mode.
export const initialConfigOptions = (
  chosen: SessionConfigOption[],
  picks: ConfigurationPicks = {},
): InitialConfigOption[] =>
  // Hermes on phones lacks toSorted.
  [...chosen]
    .sort((a, b) => startingRank(a) - startingRank(b))
    .map(({ configId, currentValue }) => ({
      configId,
      value: currentValue,
      optional: picks[configId] === undefined,
    }));
