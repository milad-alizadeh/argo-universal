import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionConfigOption } from '@repo/contracts';
import {
  type DataTag,
  type QueryClient,
  queryOptions,
  type UnusedSkipTokenOptions,
} from '@tanstack/react-query';
import {
  categories,
  orderedOptions,
  type SavedChoices,
  type RememberedOption,
} from '#lib/product/session-configuration';

let writes = Promise.resolve();

type Category = (typeof categories)[number];

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
type SavedChoicesKey = readonly ['session-configuration-preferences', string];

type SavedChoicesQuery = UnusedSkipTokenOptions<
  SavedChoices,
  Error,
  SavedChoices,
  SavedChoicesKey
> & { queryKey: DataTag<SavedChoicesKey, SavedChoices, Error> };

export function savedChoicesQuery(agent: string): SavedChoicesQuery {
  return queryOptions({
    queryKey: ['session-configuration-preferences', agent] as const,
    queryFn: () => load(agent).catch(loadFailed),
    staleTime: Infinity,
    // This Device's storage answers while the Server is unreachable.
    networkMode: 'always',
  });
}

function loadFailed(cause: unknown): SavedChoices {
  console.error('Could not load Session configuration preferences', cause);

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

function writeFailed(cause: unknown): void {
  console.error('Could not remember Session configuration', cause);
}

function cacheSavedChoices(
  client: QueryClient,
  agent: string,
  selected: RememberedOption[],
): void {
  const { queryKey } = savedChoicesQuery(agent);
  void client.cancelQueries({ queryKey, exact: true });
  client.setQueryData(queryKey, (previous) => ({
    ...previous,
    ...Object.fromEntries(
      selected.map((option) => [option.category, option.currentValue]),
    ),
  }));
}
