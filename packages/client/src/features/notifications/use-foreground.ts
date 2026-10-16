import { useEffect, useState } from 'react';
import { AppState, type NativeEventSubscription, Platform } from 'react-native';

const isForeground = (): boolean => AppState.currentState === 'active';

function subscribe(
  changed: (active: boolean) => void,
): NativeEventSubscription[] {
  const subscriptions = [
    AppState.addEventListener('change', (state) => changed(state === 'active')),
  ];

  // `blur` and `focus` exist on Android only; iOS throws on them.
  if (Platform.OS === 'android') {
    subscriptions.push(
      AppState.addEventListener('blur', () => changed(false)),
      AppState.addEventListener('focus', () => changed(isForeground())),
    );
  }

  return subscriptions;
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
