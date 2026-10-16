import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

// The ways GitHub merges a PR, as its merge button offers them.
const mergeMethods = ['squash', 'merge', 'rebase'] as const;

export type MergeMethod = (typeof mergeMethods)[number];

// GitHub's own first choice, until this device picks another.
export const defaultMergeMethod: MergeMethod = 'squash';

const storageKey = 'merge-method';

let writes = Promise.resolve();

async function load(): Promise<MergeMethod> {
  await writes;

  return asMergeMethod(await AsyncStorage.getItem(storageKey));
}

function asMergeMethod(value: string | null): MergeMethod {
  return mergeMethods.find((method) => method === value) ?? defaultMergeMethod;
}

function loadFailed(cause: unknown): MergeMethod {
  console.error('Could not load the merge method', cause);

  return defaultMergeMethod;
}

// The merge method this device used last; a failed read falls back to squash.
export const mergeMethodQuery = queryOptions({
  queryKey: ['merge-method'] as const,
  queryFn: () => load().catch(loadFailed),
  staleTime: Infinity,
  // This Device's storage answers while the Server is unreachable.
  networkMode: 'always',
});

// Kept on this device, like the Composer's choices, never on the Server.
export function rememberMergeMethod(
  client: QueryClient,
  method: MergeMethod,
): void {
  void client.cancelQueries({
    queryKey: mergeMethodQuery.queryKey,
    exact: true,
  });
  client.setQueryData(mergeMethodQuery.queryKey, method);
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, method))
    .catch(writeFailed);
}

function writeFailed(cause: unknown): void {
  console.error('Could not remember the merge method', cause);
}
