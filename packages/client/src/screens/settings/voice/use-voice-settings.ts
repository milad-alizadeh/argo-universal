import type { VoiceSettings } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConnectionState,
  useTRPC,
  type ServerMutation,
  type TRPC,
} from '#features/connection';
import type {
  VoiceDetailViewProps,
  VoiceSettingsLoad,
} from './voice-detail-view';

type Controls = Omit<VoiceDetailViewProps, 'onBack'>;

interface SettingsQuery {
  data?: VoiceSettings;
  isError: boolean;
  refetch: () => void;
}

const settledState = (query: SettingsQuery): VoiceSettingsLoad =>
  query.data
    ? { status: 'loaded', settings: query.data }
    : { status: query.isError ? 'error' : 'loading' };

const loadState = (
  connected: boolean,
  query: SettingsQuery,
): VoiceSettingsLoad =>
  connected ? settledState(query) : { status: 'disconnected' };

// What the Server answers to a change is the page's new state.
function useVoiceChange(): ServerMutation<TRPC['voice']['setSettings']> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return useMutation(
    trpc.voice.setSettings.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.voice.getSettings.queryKey(), data),
    }),
  );
}

export function useVoiceSettings(): Controls {
  const query = useQuery(useTRPC().voice.getSettings.queryOptions());
  const change = useVoiceChange();

  return {
    voice: loadState(useConnectionState() === 'open', query),
    saving: change.isPending,
    error: change.error?.message,
    onEnabledChange: (enabled) => change.mutate({ enabled }),
    onProviderChange: (provider) => change.mutate({ provider }),
    onVoiceChange: (voice) => change.mutate({ voice }),
    onRetry: () => void query.refetch(),
  };
}
