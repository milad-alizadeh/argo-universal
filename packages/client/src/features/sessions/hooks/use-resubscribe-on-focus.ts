import { focusManager } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';

// A stopped subscription starts again when the window regains focus, as failed queries refetch.
export function useResubscribeOnFocus(subscription: {
  status: string;
  reset: () => void;
}): void {
  const resetIfStopped = useEffectEvent(() => {
    if (subscription.status === 'error') subscription.reset();
  });
  useEffect(
    () =>
      focusManager.subscribe((focused) => {
        if (focused) resetIfStopped();
      }),
    [],
  );
}
