import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useServerScope } from '#lib/product/server-scope';

// The Agent is one of the Server's own, so each Server is remembered apart (ADR-0022).
const storageKey = (serverId: string): string => `${serverId}:selected-agent`;

const queryKeyOf = (serverId: string): string[] => ['selectedAgent', serverId];

type RememberedAgent = {
  agent: string | undefined;
  select: (id: string) => void;
};

const rememberAgent = (
  cache: QueryClient,
  serverId: string,
  id: string,
): void => {
  cache.setQueryData(queryKeyOf(serverId), id);
  void AsyncStorage.setItem(storageKey(serverId), id).catch(() =>
    console.error('Could not remember the selected Agent'),
  );
};

export function useRememberedAgent(): RememberedAgent {
  const cache = useQueryClient();
  const serverId = useServerScope().id;

  const query = useQuery({
    queryKey: queryKeyOf(serverId),
    queryFn: () => AsyncStorage.getItem(storageKey(serverId)),
    staleTime: Infinity,
  });

  const select = useCallback(
    (id: string) => rememberAgent(cache, serverId, id),
    [cache, serverId],
  );

  return { agent: query.data ?? undefined, select };
}
