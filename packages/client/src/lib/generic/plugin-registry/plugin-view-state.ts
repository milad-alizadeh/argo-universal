import {
  applyPatch,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';

export interface PluginViewState {
  root: WireNode | null;
  revision: number;
}

export const emptyPluginView: PluginViewState = { root: null, revision: 0 };

// A snapshot always replaces the page (it is also what a reconnect starts with); a patch older than what the App holds is dropped.
export function reducePluginView(
  state: PluginViewState,
  message: ViewMessage,
): PluginViewState {
  if (message.type === 'snapshot')
    return { root: message.root, revision: message.revision };

  if (!state.root || message.revision <= state.revision) return state;

  return {
    root: applyPatch(state.root, message.ops),
    revision: message.revision,
  };
}
