import { useSyncExternalStore } from 'react';
import type { WindowHistory } from './window-history';

export type { WindowHistory } from './window-history';

// The Navigation API reports where history can go; a browser without it leaves both buttons enabled.
const navigation = (): Navigation | undefined =>
  'navigation' in window ? window.navigation : undefined;

function subscribe(onChange: () => void): () => void {
  const target = navigation();
  target?.addEventListener('currententrychange', onChange);

  return () => target?.removeEventListener('currententrychange', onChange);
}

const canGoBack = (): boolean => navigation()?.canGoBack ?? true;

const canGoForward = (): boolean => navigation()?.canGoForward ?? true;

const back = (): void => window.history.back();

const forward = (): void => window.history.forward();

export function useWindowHistory(): WindowHistory {
  return {
    canGoBack: useSyncExternalStore(subscribe, canGoBack),
    canGoForward: useSyncExternalStore(subscribe, canGoForward),
    back,
    forward,
  };
}
