import type {
  ViewMessage,
  WireNode,
  PluginViewId,
} from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';

export interface PluginViewState {
  root: WireNode | null;
  revision: number;
  viewId: PluginViewId | null;
}

export const emptyPluginView: PluginViewState = {
  root: null,
  revision: 0,
  viewId: null,
};

type Snapshot = Extract<ViewMessage, { type: 'snapshot' }>;

type Patch = Extract<ViewMessage, { type: 'patch' }>;

export function reducePluginView(
  state: PluginViewState,
  message: ViewMessage,
): PluginViewState {
  return message.type === 'snapshot'
    ? snapshot(message)
    : patched(state, message);
}

function snapshot({ root, revision, viewId }: Snapshot): PluginViewState {
  return { root, revision, viewId: viewId ?? null };
}

function patched(
  state: PluginViewState,
  { revision, ops }: Patch,
): PluginViewState {
  if (!state.root || revision <= state.revision) return state;

  return { ...state, root: applyPatch(state.root, ops), revision };
}
