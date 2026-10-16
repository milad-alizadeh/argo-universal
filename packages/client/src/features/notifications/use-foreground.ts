import { useEffect, useState } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

const isForeground = (): boolean => AppState.currentState === 'active';

function subscribe(
  changed: (active: boolean) => void,
): NativeEventSubscription[] {
  return [
    AppState.addEventListener('change', (state) => changed(state === 'active')),
    AppState.addEventListener('blur', () => changed(false)),
    AppState.addEventListener('focus', () => changed(isForeground())),
  ];
}

export function useNotificationForeground(): boolean {
  const [active, setActive] = useState(isForeground);
  useEffect(() => {
    const subscriptions = subscribe(setActive);

    return (): void => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);

  return active;
}
