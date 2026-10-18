import type {
  ActionTarget,
  OpenOverlay,
  Answer,
  Flush,
  PluginActions,
  OverlayView,
  OverlayState,
} from './plugin-action-types';

export type {
  ActionTarget,
  OpenOverlay,
  PluginActions,
} from './plugin-action-types';

import type { Action, OverlayAction } from '@repo/contracts/plugins/wire';
import { useState } from 'react';
import { runAction } from './plugin-registry-actions';

const initialView: OverlayView = { overlay: null, pending: null };

export function usePluginActions(): PluginActions {
  const [view, update] = useState(initialView);
  const [state] = useState(() => overlayState(update));

  return actionsFor(view, state);
}

function overlayState(update: OverlayState['update']): OverlayState {
  return {
    current: null,
    busy: false,
    generation: 0,
    update,
    flushers: new Set(),
  };
}

function actionsFor(view: OverlayView, state: OverlayState): PluginActions {
  return {
    ...view,
    registerFlush: (flush) => registerFlush(state, flush),
    finish: (confirmed, id) => finishOverlay(state, confirmed, id),
    run: (action, target) => run(state, action, target),
  };
}

async function run(
  state: OverlayState,
  action: Action,
  target: ActionTarget,
): Promise<void> {
  if ('content' in action) return openOverlay(state, action, target);

  if (action.action === 'dismiss') return finishOverlay(state, false);

  await runAction(action);
}

async function openOverlay(
  state: OverlayState,
  action: OverlayAction,
  target: ActionTarget,
): Promise<void> {
  if (state.busy)
    throw new Error('The open overlay is waiting for its handler');
  await finishOverlay(state, false);
  state.generation += 1;
  open(state, { id: state.generation, action, target });
}

function open(state: OverlayState, overlay: OpenOverlay | null): void {
  state.current = overlay;
  state.update((view) => ({ ...view, overlay }));
}

function markPending(state: OverlayState, pending: Answer | null): void {
  state.busy = pending !== null;
  state.update((view) => ({ ...view, pending }));
}

async function finishOverlay(
  state: OverlayState,
  confirmed: boolean,
  id?: number,
): Promise<void> {
  const overlay = availableOverlay(state, id);

  if (!overlay) return;
  const event = confirmed ? 'onConfirm' : 'onDismiss';
  await settleAnswer(state, overlay, event);
}

async function settleAnswer(
  state: OverlayState,
  overlay: OpenOverlay,
  event: Answer,
): Promise<void> {
  markPending(state, event);

  try {
    await sendAndClose(state, overlay, event);
  } finally {
    markPending(state, null);
  }
}

async function sendAndClose(
  state: OverlayState,
  overlay: OpenOverlay,
  event: Answer,
): Promise<void> {
  try {
    await sendAfterEdits(state, overlay, event);
  } finally {
    if (event === 'onDismiss') open(state, null);
  }

  if (event === 'onConfirm') open(state, null);
}

async function sendAfterEdits(
  state: OverlayState,
  overlay: OpenOverlay,
  event: Answer,
): Promise<void> {
  if (event === 'onConfirm')
    await Promise.all([...state.flushers].map((flush) => flush()));
  await sendAnswer(overlay, event);
}

function registerFlush(state: OverlayState, flush: Flush): () => void {
  state.flushers.add(flush);

  return () => {
    state.flushers.delete(flush);
  };
}

function availableOverlay(
  state: OverlayState,
  id?: number,
): OpenOverlay | null {
  if (state.busy) return null;

  return matchingOverlay(state.current, id);
}

function matchingOverlay(
  overlay: OpenOverlay | null,
  id?: number,
): OpenOverlay | null {
  if (!overlay) return null;

  return matches(overlay, id) ? overlay : null;
}

function matches(overlay: OpenOverlay, id?: number): boolean {
  return id === undefined || overlay.id === id;
}

async function sendAnswer(
  { action, target }: OpenOverlay,
  event: Answer,
): Promise<void> {
  const handler = action[event];

  if (!handler) return;
  const path = handler.$path ?? [...target.path, event];

  await target.send(target.key, { event: 'onAction', payload: { path } });
}
