import { focusManager } from '@tanstack/react-query';

// The part of React Native's AppState that tells the foreground from the background.
export interface AppStateSource {
  addEventListener: (
    event: 'change',
    listener: (state: string) => void,
  ) => { remove: () => void };
}

// React Query's own listener, which a browser tab uses; put back when the App stops following AppState.
function followsTabVisibility(
  handleFocus: (focused?: boolean) => void,
): (() => void) | undefined {
  if (typeof window === 'undefined' || !window.addEventListener)
    return undefined;

  const listener = (): void => {
    handleFocus();
  };

  window.addEventListener('visibilitychange', listener, false);

  return (): void => {
    window.removeEventListener('visibilitychange', listener);
  };
}

/*
 * React Query refetches stale queries when a browser tab regains focus. A phone has no tab focus, so the App's
 * foreground state stands in for it: coming back to the foreground refetches what is stale and resubscribes.
 */
export function followAppForeground(appState: AppStateSource): () => void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = appState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });

    return (): void => {
      subscription.remove();
    };
  });

  return (): void => {
    focusManager.setEventListener(followsTabVisibility);
  };
}

// A phone follows AppState; the web App and the desktop shell keep React Query's tab focus.
export function followAppForegroundOnNative(
  platform: string,
  appState: AppStateSource,
): (() => void) | undefined {
  return platform === 'web' ? undefined : followAppForeground(appState);
}
