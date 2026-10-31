import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConnectionState,
  useTRPC,
  type ServerMutation,
  type TRPC,
} from '#features/connection';
import type {
  DeviceListViewProps,
  LocalNetworkAccessLoad,
} from './device-list-view';

type Controls = Omit<DeviceListViewProps, 'onBack'>;

interface AccessQuery {
  data?: { enabled: boolean };
  isError: boolean;
  refetch: () => void;
}

export function useLocalNetworkAccess(): Controls {
  const trpc = useTRPC();
  const query = useQuery(trpc.network.localAccess.queryOptions());
  const change = useAccessChange();

  return {
    localNetworkAccess: loadState(useConnectionState() === 'open', query),
    saving: change.isPending,
    error: change.error?.message,
    onLocalNetworkAccessChange: (enabled) => change.mutate({ enabled }),
    onRetry: () => {
      void query.refetch();
    },
  };
}

function useAccessChange(): ServerMutation<TRPC['network']['setLocalAccess']> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return useMutation(
    trpc.network.setLocalAccess.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.network.localAccess.queryKey(), data),
    }),
  );
}

function loadState(
  connected: boolean,
  query: AccessQuery,
): LocalNetworkAccessLoad {
  if (!connected) return { status: 'disconnected' };

  return connectedState(query);
}

function connectedState(query: AccessQuery): LocalNetworkAccessLoad {
  if (query.data) return { status: 'loaded', enabled: query.data.enabled };

  return { status: query.isError ? 'error' : 'loading' };
}
