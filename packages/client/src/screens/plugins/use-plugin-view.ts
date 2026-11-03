import type { PluginViewInput } from '@repo/contracts/plugins/wire';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  emptyPluginView,
  reducePluginView,
  type PluginViewState,
  type PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { HeldEvents } from './held-events';
import { keepPluginTree, keptPluginTreeOptions } from './plugin-page-trees';
import { usePluginBinding } from './use-plugin-binding';
import { usePluginStream } from './use-plugin-stream';

export interface PluginView extends PluginViewState {
  dispatch: PluginOnEvent;
  // Changes when one live view replaces another, such as after a Plugin reload: a new tree, with no drafts from the old.
  treeKey: number;
}

/*
 * Watches one Plugin page on the connected Server, for a Session when it opened for one; its events dispatch to the
 * view they came from. A view that is not `live` is closed on the Server. Until a view is open the page draws the last
 * tree it kept (ADR-0048), and the view's first snapshot replaces that tree in place, so nothing remounts.
 */
export function usePluginView(page: PluginViewInput, live = true): PluginView {
  const kept = useQuery(keptPluginTreeOptions(page)).data ?? null;
  const state = usePluginViewStream(page, live, kept);

  useKeepTree(page, state);

  const { onEvent } = usePluginBinding()({ ...page, view: state });
  const drawn = state.viewId ? state : { ...state, root: kept };

  return {
    ...drawn,
    dispatch: useHeldUntilLive({ page, live, drawn, onEvent }),
    treeKey: useLiveViewCount(state.viewId),
  };
}

function usePluginViewStream(
  page: PluginViewInput,
  live: boolean,
  kept: PluginViewState['root'],
): PluginViewState {
  const { state } = usePluginStream(
    { page, live },
    (trpc, input, onData) =>
      trpc.plugins.view.subscriptionOptions(input.page, {
        onData,
        enabled: input.live,
      }),
    { initial: { ...emptyPluginView, root: kept }, reduce: reducePluginView },
  );

  return state;
}

// Only what a live view drew is kept, so an entry dropped under a live page stays dropped until the page changes.
function useKeepTree(page: PluginViewInput, state: PluginViewState): void {
  const client = useQueryClient();
  const { root, viewId } = state;
  const liveTree = viewId ? root : null;
  const key = JSON.stringify(page);

  useEffect(() => {
    if (liveTree) keepPluginTree(client, JSON.parse(key), liveTree);
  }, [client, key, liveTree]);
}

interface HoldingInput {
  page: PluginViewInput;
  live: boolean;
  drawn: PluginViewState;
  onEvent: PluginOnEvent;
}

// A tap on a tree with no view behind it waits for the view; the choice and its reasons are in ADR-0048.
function useHeldUntilLive(input: HoldingInput): PluginOnEvent {
  const { page, live, drawn, onEvent } = input;
  const { root, viewId } = drawn;
  const [held] = useState(() => new HeldEvents());
  const key = JSON.stringify(page);

  useEffect(() => {
    if (viewId && root) held.release(root, onEvent);
  });

  useEffect(() => {
    if (!live) held.drop();
  }, [held, live]);

  useEffect(() => (): void => held.drop(), [held, key]);

  if (viewId || !root) return onEvent;

  return (nodeKey, event) => held.hold(root, nodeKey, event);
}

// A tree outlives the step from kept to live and a view closing, and starts over only when a view is replaced by another.
function useLiveViewCount(viewId: PluginViewState['viewId']): number {
  const [seen, setSeen] = useState({ viewId, count: 0 });

  if (viewId !== seen.viewId)
    setSeen({
      viewId,
      count: viewId && seen.viewId ? seen.count + 1 : seen.count,
    });

  return viewId && seen.viewId && viewId !== seen.viewId
    ? seen.count + 1
    : seen.count;
}
