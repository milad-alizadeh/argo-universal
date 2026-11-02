import type { PluginViewInput } from '@repo/contracts/plugins/wire';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginBinding } from './use-plugin-binding';
import { usePluginStream } from './use-plugin-stream';

export interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
}

/*
 * Watches one Plugin page on the connected Server, for a Session when it opened for one; its events dispatch to the
 * view they came from. A view that is not `live` is closed on the Server and keeps its last tree, so a page returned to
 * draws at once while its view opens again.
 */
export function usePluginView(page: PluginViewInput, live = true): PluginView {
  const { state } = usePluginStream(
    page,
    (trpc, input, onData) =>
      trpc.plugins.view.subscriptionOptions(input, { onData, enabled: live }),
    { initial: emptyPluginView, reduce: reducePluginView },
  );

  const { onEvent } = usePluginBinding()({ ...page, view: state });

  return { ...state, dispatch: onEvent };
}
