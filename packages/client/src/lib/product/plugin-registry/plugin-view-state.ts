import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';

export interface PluginViewState {
  root: WireNode | null;
  revision: number;
  viewId: string | null;
}

export const emptyPluginView: PluginViewState = {
  root: null,
  revision: 0,
  viewId: null,
};

type Patch = Extract<ViewMessage, { type: 'patch' }>;

// A patch older than what the App holds is dropped.
function patched(state: PluginViewState, message: Patch): PluginViewState {
  if (!state.root || message.revision <= state.revision) return state;

  return {
    ...state,
    root: applyPatch(state.root, message.ops),
    revision: message.revision,
  };
}

// A snapshot always replaces the page (it is also what a reconnect starts with).
export function reducePluginView(
  state: PluginViewState,
  message: ViewMessage,
): PluginViewState {
  if (message.type === 'snapshot')
    return {
      root: message.root,
      revision: message.revision,
      viewId: message.viewId ?? null,
    };

  return patched(state, message);
}
