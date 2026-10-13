import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionConfigOption } from '@repo/contracts';
import type { QueryClient } from '@tanstack/react-query';
import {
  categories,
  orderedOptions,
  type SavedChoices,
  type RememberedOption,
} from './configuration-preferences';
let writes = Promise.resolve();
type Category = (typeof categories)[number];
function queryKey(agent: string): readonly string[] {
  return ['session-configuration-preferences', agent];
}
function storageKey(agent: string, category: Category): string {
  return `session-configuration:${agent}:${category}`;
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
interface SavedChoicesQuery {
  queryKey: readonly string[];
  queryFn: () => Promise<SavedChoices>;
  staleTime: number;
}
export function savedChoicesQuery(agent: string): SavedChoicesQuery {
  return {
    queryKey: queryKey(agent),
    queryFn: () => load(agent).catch(loadFailed),
    staleTime: Infinity,
  };
}
function loadFailed(error: unknown): SavedChoices {
  console.error('Could not load Session configuration preferences', error);
  return {};
}
export function rememberSessionConfiguration(
  client: QueryClient,
  agent: string,
  options: SessionConfigOption[],
): void {
  const selected = orderedOptions(options);
  cacheSavedChoices(client, agent, selected);
  const entries = savedEntries(agent, selected);
  writes = writes.then(() => AsyncStorage.multiSet(entries)).catch(writeFailed);
}
function savedEntries(
  agent: string,
  selected: RememberedOption[],
): [string, string][] {
  return selected.map((option) => [
    storageKey(agent, option.category),
    option.currentValue,
  ]);
}
function writeFailed(error: unknown): void {
  console.error('Could not remember Session configuration', error);
}
function cacheSavedChoices(
  client: QueryClient,
  agent: string,
  selected: RememberedOption[],
): void {
  void client.cancelQueries({ queryKey: queryKey(agent), exact: true });
  client.setQueryData<SavedChoices>(queryKey(agent), (previous) => ({
    ...previous,
    ...Object.fromEntries(
      selected.map((option) => [option.category, option.currentValue]),
    ),
  }));
}
