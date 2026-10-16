import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useResubscribeOnReconnect } from '#features/connection';
import {
  type EmptySessionChoices,
  type EmptySessionState,
  EmptySessionStore,
} from '#features/sessions';
import { useEmptySessionPorts } from './empty-session-adapters';

export interface EmptySession extends EmptySessionState {
  store: EmptySessionStore;
}

// One store for the screen's life, given the screen's latest ports.
function useStore(clearDraft: () => void): EmptySessionStore {
  const ports = useEmptySessionPorts(clearDraft);
  const [store] = useState(() => new EmptySessionStore(ports));
  useEffect(() => {
    store.setPorts(ports);
  });

  // StrictMode's rehearsal stop comes before any Session opens.
  useEffect(() => {
    store.start();

    return (): void => store.stop();
  }, [store]);

  return store;
}

// The input is rebuilt each render; the store hears of it only when its value changes.
function useChooseInStore(
  store: EmptySessionStore,
  { input, connected }: EmptySessionChoices,
): void {
  const latestInput = useRef(input);
  useEffect(() => {
    latestInput.current = input;
  });
  const choiceKey = JSON.stringify(input ?? null);
  useEffect(() => {
    store.choose({ input: latestInput.current, connected });
  }, [store, choiceKey, connected]);
}

// New Session's real, empty Session for the current choices; leaving without sending closes it.
export function useEmptySession(
  choices: EmptySessionChoices,
  clearDraft: () => void,
): EmptySession {
  const store = useStore(clearDraft);
  useChooseInStore(store, choices);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  useResubscribeOnReconnect({
    status: state.attempt.status === 'idle' ? 'idle' : 'error',
    reset: () => store.openAgain({ by: 'connection' }),
  });

  return { store, ...state };
}
