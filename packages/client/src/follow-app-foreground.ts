import { focusManager } from '@tanstack/react-query';

// The part of React Native's AppState that tells the foreground from the background.
export interface AppStateSource {
  addEventListener: (
    event: 'change',
    listener: (state: string) => void,
  ) => { remove: () => void };
}

const listensToNothing = (): (() => void) => (): void => {
  // Nothing was subscribed, so nothing is released.
};

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
    focusManager.setEventListener(listensToNothing);
  };
}
