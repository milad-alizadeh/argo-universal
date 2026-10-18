import { useSubscription } from '@trpc/tanstack-react-query';
import { useReducer } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
} from '../../lib/product/plugin-registry';
import { usePluginDispatch } from './use-plugin-dispatch';

interface PluginView extends PluginViewState {
  // Sends a tapped node's event id to the Plugin's handler.
  dispatch: (eventId: string) => void;
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

  const send = usePluginDispatch();

  return { ...state, dispatch: (eventId) => send(pluginId, path, eventId) };
}
