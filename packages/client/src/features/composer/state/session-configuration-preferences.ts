import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { QueryClient } from '@tanstack/react-query';
import {
  configurationChoices,
  configurationEffortChoices,
} from './configuration-choices';

const categories = ['model', 'thought_level', 'mode'] as const;
type Category = (typeof categories)[number];
export type SavedChoices = Partial<Record<Category, string>>;
type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;
type RememberedOption = SelectOption & { category: Category };
let writes = Promise.resolve();
export interface ConfigurationChange {
  configId: string;
  value: string;
}

function queryKey(agent: string): readonly string[] {
  return ['session-configuration-preferences', agent];
}
function storageKey(agent: string, category: Category): string {
  return `session-configuration:${agent}:${category}`;
}
export function isRememberedConfiguration(
  option: SessionConfigOption,
): option is RememberedOption {
  return (
    option.type === 'select' &&
    categories.some((category) => category === option.category)
  );
}
function orderedOptions(options: SessionConfigOption[]): RememberedOption[] {
  const eligible = options.filter(isRememberedConfiguration);
  return categories.flatMap((category) =>
    eligible.filter((option) => option.category === category),
  );
}
async function load(agent: string): Promise<SavedChoices> {
  await writes;
  const values = await Promise.all(
    categories.map((category) =>
      AsyncStorage.getItem(storageKey(agent, category)),
    ),
  );
  return Object.fromEntries(
    categories.flatMap((category, index) => {
      const value = values[index];
      return value ? [[category, value]] : [];
    }),
  );
}

// The choices this device saved for an Agent; a failed read starts from the Agent's defaults.
export function savedChoicesQuery(agent: string): {
  queryKey: readonly string[];
  queryFn: () => Promise<SavedChoices>;
  staleTime: number;
} {
  return {
    queryKey: queryKey(agent),
    queryFn: () =>
      load(agent).catch((error: unknown) => {
        console.error(
          'Could not load Session configuration preferences',
          error,
        );
        return {};
      }),
    staleTime: Infinity,
  };
}
function withSavedChoice(
  option: RememberedOption,
  saved: SavedChoices,
  offered: SessionConfigSelectOption[] = configurationChoices(option),
): RememberedOption | undefined {
  const value = [
    saved[option.category],
    option.currentValue,
    offered[0]?.value,
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
  const model = defaultModel && withSavedChoice(defaultModel, saved);
  return defaults.flatMap(
    (option) =>
      withSavedChoice(
        option,
        saved,
        option.category === 'thought_level'
          ? configurationEffortChoices(model, option)
          : configurationChoices(option),
      ) ?? [],
  );
}

// App-local preferences; the Session's authoritative configuration stays on the Server.
export function rememberSessionConfiguration(
  client: QueryClient,
  agent: string,
  options: SessionConfigOption[],
): void {
  const selected = orderedOptions(options);
  void client.cancelQueries({ queryKey: queryKey(agent), exact: true });
  client.setQueryData<SavedChoices>(queryKey(agent), (previous) => ({
    ...previous,
    ...Object.fromEntries(
      selected.map((option) => [option.category, option.currentValue]),
    ),
  }));
  const entries = selected.map((option): [string, string] => [
    storageKey(agent, option.category),
    option.currentValue,
  ]);
  writes = writes
    .then(() => AsyncStorage.multiSet(entries))
    .catch((error: unknown) => {
      console.error('Could not remember Session configuration', error);
    });
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
    .find(({ configId, value }) =>
      current.some(
        (option) =>
          option.configId === configId && option.currentValue !== value,
      ),
    );
}
