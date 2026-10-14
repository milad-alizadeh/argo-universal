// The part of React Native's AppState this module reads.
export interface AppStates {
  currentState: string;
  addEventListener: (
    type: 'change',
    listener: (state: string) => void,
  ) => { remove: () => void };
}

// Calls back each time the App comes back to the foreground; returns the unsubscribe.
export function onForeground(
  appState: AppStates,
  returned: () => void,
): () => void {
  let previous = appState.currentState;

  const subscription = appState.addEventListener('change', (state) => {
    const cameBack = state === 'active' && previous !== 'active';

    previous = state;

    if (cameBack) returned();
  });

  return () => subscription.remove();
}
