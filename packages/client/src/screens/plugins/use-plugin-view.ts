import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginBinding, usePluginStream } from './use-plugin-stream';

interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
}

// Watches one Plugin page on the connected Server; its events dispatch to the view they came from.
export function usePluginView(pluginId: string, path: string): PluginView {
  const page = { pluginId, path };

  const { state } = usePluginStream(
    page,
    (trpc, input, onData) =>
      trpc.plugins.view.subscriptionOptions(input, { onData }),
    { initial: emptyPluginView, reduce: reducePluginView },
  );

  const { onEvent } = usePluginBinding()({ ...page, view: state });

  return { ...state, dispatch: onEvent };
}
