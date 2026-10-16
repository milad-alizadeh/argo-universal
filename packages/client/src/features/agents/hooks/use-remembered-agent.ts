import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

const storageKey = 'selected-agent';

const queryKey = ['selectedAgent'];

type RememberedAgent = {
  agent: string | undefined;
  select: (id: string) => void;
};

const rememberAgent = (cache: QueryClient, id: string): void => {
  cache.setQueryData(queryKey, id);
  void AsyncStorage.setItem(storageKey, id).catch(() =>
    console.error('Could not remember the selected Agent'),
  );
};

export function useRememberedAgent(): RememberedAgent {
  const cache = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: () => AsyncStorage.getItem(storageKey),
    staleTime: Infinity,
  });

  const select = useCallback((id: string) => rememberAgent(cache, id), [cache]);

  return { agent: query.data ?? undefined, select };
}
