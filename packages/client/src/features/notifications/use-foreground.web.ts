import { useSyncExternalStore } from 'react';

const isForeground = (): boolean =>
  document.visibilityState === 'visible' && document.hasFocus();

function watchForeground(changed: () => void): () => void {
  window.addEventListener('focus', changed);
  window.addEventListener('blur', changed);
  document.addEventListener('visibilitychange', changed);

  return () => {
    window.removeEventListener('focus', changed);
    window.removeEventListener('blur', changed);
    document.removeEventListener('visibilitychange', changed);
  };
}

export const useNotificationForeground = (): boolean =>
  useSyncExternalStore(watchForeground, isForeground, () => false);
