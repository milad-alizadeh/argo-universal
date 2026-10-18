import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { errorToast } from '#lib/generic/error-toast';
import { useErrorToast } from '#primitives/overlays/toast';

export type PluginDispatch = (
  pluginId: string,
  path: string,
  eventId: string,
) => void;

// Sends a tapped node's event id to its Plugin's handler; a failed send shows an error toast.
export function usePluginDispatch(): PluginDispatch {
  const trpc = useTRPC();
  const dispatch = useMutation(trpc.plugins.dispatch.mutationOptions());

  useErrorToast(errorToast('Could not reach the Plugin', dispatch.error));

  return (pluginId, path, eventId) =>
    dispatch.mutate({ pluginId, path, eventId });
}
