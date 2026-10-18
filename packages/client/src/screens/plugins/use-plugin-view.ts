import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginDispatch, bindPluginDispatch } from './use-plugin-dispatch';
import { usePluginStreamState } from './use-plugin-stream-state';

interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
}

type Page = { pluginId: string; path: string };

function usePageState(page: Page): PluginViewState {
  const trpc = useTRPC();

  const { value, receive } = usePluginStreamState(
    { trpc, key: JSON.stringify(page) },
    emptyPluginView,
    reducePluginView,
  );

  const subscription = useSubscription(
    trpc.plugins.view.subscriptionOptions(page, { onData: receive }),
  );

  useResubscribeOnReconnect(subscription);

  return value;
}

export function usePluginView(pluginId: string, path: string): PluginView {
  const state = usePageState({ pluginId, path });
  const send = usePluginDispatch();

  const { revision, viewId } = state;
  const target = { pluginId, path, revision, viewId };

  return { ...state, dispatch: bindPluginDispatch(send, target) };
}
