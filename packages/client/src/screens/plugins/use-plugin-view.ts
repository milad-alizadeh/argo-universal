import type { PluginViewInput } from '@repo/contracts/plugins/wire';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginBinding } from './use-plugin-binding';
import { usePluginStream } from './use-plugin-stream';

interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
}

// Watches one Plugin page on the connected Server, for a Session when it opened for one; its events dispatch to the view they came from.
export function usePluginView(page: PluginViewInput): PluginView {
  const { state } = usePluginStream(
    page,
    (trpc, input, onData) =>
      trpc.plugins.view.subscriptionOptions(input, { onData }),
    { initial: emptyPluginView, reduce: reducePluginView },
  );

  const { onEvent } = usePluginBinding()({ ...page, view: state });

  return { ...state, dispatch: onEvent };
}
