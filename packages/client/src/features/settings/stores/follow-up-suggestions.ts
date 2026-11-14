import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

const storageKey = 'follow-up-suggestions';

let writes = Promise.resolve();

export async function loadFollowUpSuggestions(): Promise<boolean> {
  await writes;

  try {
    return (await AsyncStorage.getItem(storageKey)) !== 'false';
  } catch (cause) {
    console.error('Could not load Follow-up suggestions preference', cause);

    return true;
  }
}

export function saveFollowUpSuggestions(enabled: boolean): void {
  writes = writes
    .then(() => AsyncStorage.setItem(storageKey, String(enabled)))
    .catch((cause: unknown) =>
      console.error('Could not save Follow-up suggestions preference', cause),
    );
}

const preference = queryOptions({
  queryKey: ['follow-up-suggestions'],
  queryFn: loadFollowUpSuggestions,
  staleTime: Infinity,
  networkMode: 'always',
});

type FollowUpPreference = {
  enabled: boolean | undefined;
  choose: (enabled: boolean) => void;
};

export function useFollowUpSuggestionsPreference(): FollowUpPreference {
  const client = useQueryClient();
  const { data } = useQuery(preference);

  return {
    enabled: data,
    choose: (enabled) => {
      client.setQueryData(preference.queryKey, enabled);
      saveFollowUpSuggestions(enabled);
    },
  };
}
