import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export const sessionsLayoutChoices = [
  { value: 'regular', label: 'Regular' },
  { value: 'compact', label: 'Compact' },
] as const;

// Regular rows show the activity, metadata and Plan bar; Compact rows show one line each.
export type SessionsLayout = (typeof sessionsLayoutChoices)[number]['value'];

export const sessionsLayoutStorageKey = 'sessions-layout';

export interface SessionsLayoutStore {
  get: () => SessionsLayout;
  choose: (layout: SessionsLayout) => void;
  subscribe: (listener: () => void) => () => void;
  // Settles once the layout this Device saved is read, or reading it failed.
  loaded: Promise<void>;
}

export const isSessionsLayout = (
  value: string | null,
): value is SessionsLayout =>
  sessionsLayoutChoices.some((choice) => choice.value === value);

interface LayoutState {
  layout: SessionsLayout;
  // The person chose a layout here, so the saved one no longer applies.
  chosen: boolean;
  // Writes run one after another, so the last choice is the one kept.
  writes: Promise<void>;
  listeners: Set<() => void>;
}

function setLayout(state: LayoutState, next: SessionsLayout): void {
  if (state.layout === next) return;

  state.layout = next;

  for (const listener of state.listeners) listener();
}

const loadSaved = (state: LayoutState): Promise<void> =>
  AsyncStorage.getItem(sessionsLayoutStorageKey)
    .then((saved) => {
      if (!state.chosen && isSessionsLayout(saved)) setLayout(state, saved);
    })
    .catch(loadFailed);

function chooseLayout(state: LayoutState, next: SessionsLayout): void {
  state.chosen = true;
  setLayout(state, next);
  state.writes = state.writes
    .then(() => AsyncStorage.setItem(sessionsLayoutStorageKey, next))
    .catch(keepFailed);
}

function subscribeTo(state: LayoutState, listener: () => void): () => void {
  state.listeners.add(listener);

  return () => state.listeners.delete(listener);
}

/*
 * The Sessions list's layout, kept on this Device: Regular until the saved choice loads.
 * A choice made before the load finishes wins over the saved one.
 */
export function sessionsLayoutOnDevice(): SessionsLayoutStore {
  const state: LayoutState = {
    layout: 'regular',
    chosen: false,
    writes: Promise.resolve(),
    listeners: new Set(),
  };

  return {
    get: () => state.layout,
    choose: (next) => chooseLayout(state, next),
    subscribe: (listener) => subscribeTo(state, listener),
    loaded: loadSaved(state),
  };
}

function loadFailed(cause: unknown): void {
  console.error('Could not load the Sessions layout', cause);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the Sessions layout', cause);
}

let deviceLayout: SessionsLayoutStore | undefined;

// One store for the app, made on first use so nothing reads storage at import.
const sessionsLayout = (): SessionsLayoutStore =>
  (deviceLayout ??= sessionsLayoutOnDevice());

export function useSessionsLayout(): [
  SessionsLayout,
  (layout: SessionsLayout) => void,
] {
  const store = sessionsLayout();
  const layout = useSyncExternalStore(store.subscribe, store.get, store.get);

  return [layout, store.choose];
}
