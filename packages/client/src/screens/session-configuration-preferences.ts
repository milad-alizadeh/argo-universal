import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AgentInfo,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';
import {
  configurationChoices,
  configurationEffortChoices,
} from '../components/composer-configuration';

const categories = ['model', 'thought_level'] as const;
type Category = (typeof categories)[number];
type SavedChoices = Partial<Record<Category, string>>;
type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;
type RememberedOption = SelectOption & { category: Category };
let writes = Promise.resolve();
interface NewSessionConfiguration {
  configOptions: SessionConfigOption[];
  ready: boolean;
  change: (configId: string, value: string | boolean) => void;
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
    (option.category === 'model' || option.category === 'thought_level')
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
  const [model, effort] = await Promise.all(
    categories.map((category) =>
      AsyncStorage.getItem(storageKey(agent, category)),
    ),
  );
  return { model: model ?? undefined, thought_level: effort ?? undefined };
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
function draftConfiguration(
  agent: AgentInfo | undefined,
  saved: SavedChoices,
): RememberedOption[] {
  const defaults = orderedOptions(agent?.configOptions ?? []);
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

export function useNewSessionConfiguration(
  agent: AgentInfo | undefined,
): NewSessionConfiguration {
  const client = useQueryClient();
  const id = agent?.agent ?? '';
  const [switchValues, setSwitchValues] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const saved = useQuery({
    queryKey: queryKey(id),
    queryFn: () =>
      load(id).catch((error: unknown) => {
        console.error(
          'Could not load Session configuration preferences',
          error,
        );
        return {};
      }),
    enabled: !!agent,
    staleTime: Infinity,
  });
  const remembered = draftConfiguration(agent, saved.data ?? {});
  const configOptions = (agent?.configOptions ?? []).flatMap((option) => {
    if (isRememberedConfiguration(option))
      return (
        remembered.find((entry) => entry.configId === option.configId) ?? []
      );
    if (option.type === 'boolean')
      return {
        ...option,
        currentValue:
          switchValues[id]?.[option.configId] ?? option.currentValue,
      };
    return [];
  });
  return {
    configOptions: saved.isSuccess ? configOptions : [],
    ready: saved.isSuccess,
    change: (configId: string, value: string | boolean): void => {
      if (!saved.isSuccess) return;
      if (typeof value === 'boolean') {
        setSwitchValues((previous) => ({
          ...previous,
          [id]: { ...previous[id], [configId]: value },
        }));
        return;
      }
      const changed = configOptions.map((option) =>
        option.type === 'select' && option.configId === configId
          ? { ...option, currentValue: value }
          : option,
      );
      rememberSessionConfiguration(client, id, changed);
    },
  };
}
