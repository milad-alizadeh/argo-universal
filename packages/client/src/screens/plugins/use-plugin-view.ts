import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useReducer } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { errorToast } from '#lib/generic/error-toast';
import { useErrorToast } from '#primitives/overlays/toast';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
} from '../../lib/product/plugin-registry';

interface PluginView extends PluginViewState {
  // Sends a tapped node's event id to the Plugin's handler.
  dispatch: (eventId: string) => void;
}

type Dispatch = (eventId: string) => void;

function useDispatch(pluginId: string, path: string): Dispatch {
  const trpc = useTRPC();
  const dispatch = useMutation(trpc.plugins.dispatch.mutationOptions());

  useErrorToast(errorToast('Could not reach the Plugin', dispatch.error));

  return (eventId) => dispatch.mutate({ pluginId, path, eventId });
}

// Watches one Plugin page on the connected Server: a snapshot first, then patches.
export function usePluginView(pluginId: string, path: string): PluginView {
  const trpc = useTRPC();
  const [state, receive] = useReducer(reducePluginView, emptyPluginView);

  const subscription = useSubscription(
    trpc.plugins.view.subscriptionOptions(
      { pluginId, path },
      { onData: receive },
    ),
  );

  useResubscribeOnReconnect(subscription);

  return { ...state, dispatch: useDispatch(pluginId, path) };
}
