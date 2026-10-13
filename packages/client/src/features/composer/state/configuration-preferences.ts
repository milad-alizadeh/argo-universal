import type {
  AgentInfo,
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
export interface NewSessionConfiguration {
  configOptions: SessionConfigOption[];
  ready: boolean;
  change: (configId: string, value: string | boolean) => void;
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
// The model, effort and mode a new Session starts with: each saved choice the Agent still offers, else its default, else its first offered value.
export function draftConfiguration(
  agent: AgentInfo | undefined,
  saved: SavedChoices,
): RememberedOption[] {
  const defaults = agentOptions(agent);
  const defaultModel = defaults.find((option) => option.category === 'model');
  const model = savedModel(defaultModel, saved);
  return defaults.flatMap(
    (option) =>
      withSavedChoice(option, saved, offeredChoices(option, model)) ?? [],
  );
}

function agentOptions(agent: AgentInfo | undefined): RememberedOption[] {
  return orderedOptions(agent?.configOptions ?? []);
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
export function newConfigurationOptions(
  agent: AgentInfo | undefined,
  remembered: RememberedOption[],
  switches: Record<string, boolean> | undefined,
): SessionConfigOption[] {
  return (agent?.configOptions ?? []).flatMap((option) =>
    draftOption(option, remembered, switches),
  );
}
function draftOption(
  option: SessionConfigOption,
  remembered: RememberedOption[],
  switches: Record<string, boolean> | undefined,
): SessionConfigOption[] {
  if (isRememberedConfiguration(option))
    return rememberedOption(option, remembered);
  return option.type === 'boolean'
    ? [{ ...option, currentValue: switchValue(option, switches) }]
    : [];
}
function rememberedOption(
  option: SessionConfigOption,
  remembered: RememberedOption[],
): RememberedOption[] {
  const selected = remembered.find(
    (entry) => entry.configId === option.configId,
  );
  return selected ? [selected] : [];
}
function switchValue(
  option: Extract<SessionConfigOption, { type: 'boolean' }>,
  switches: Record<string, boolean> | undefined,
): boolean {
  return switches?.[option.configId] ?? option.currentValue;
}
export function changedSelection(
  option: SessionConfigOption,
  configId: string,
  value: string,
): SessionConfigOption {
  return option.type === 'select' && option.configId === configId
    ? { ...option, currentValue: value }
    : option;
}
