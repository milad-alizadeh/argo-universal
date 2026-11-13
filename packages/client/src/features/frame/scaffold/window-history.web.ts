import { usePathname } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { upFrom } from '#lib/product/navigation/up';
import type { HistoryStep, WindowHistory } from './window-history';

export type { HistoryStep, WindowHistory } from './window-history';

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

const historyBack = (): void => window.history.back();

const historyForward = (): void => window.history.forward();

// A disabled button is never pressed, so its move is only a placeholder.
const disabled: HistoryStep = { enabled: false, go: historyBack };

// Back goes through history; a page opened by link or reload has none, so Back goes up to its section's list.
function backStep(inHistory: boolean, path: string): HistoryStep {
  if (inHistory) return { enabled: true, go: historyBack };

  const up = upFrom(path);

  return up ? { enabled: true, go: up } : disabled;
}

export function useWindowHistory(): WindowHistory {
  const path = usePathname();
  const back = useSyncExternalStore(subscribe, canGoBack);
  const forward = useSyncExternalStore(subscribe, canGoForward);

  return {
    back: backStep(back, path),
    forward: { enabled: forward, go: historyForward },
  };
}
