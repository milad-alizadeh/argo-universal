import type { DesktopBridge } from '@repo/contracts';
import { useSyncExternalStore } from 'react';

export interface ForegroundSignals {
  visible: boolean;
  focused: boolean;
  // Only the desktop app reports it; Linux keeps a minimized window visible and focused to the page.
  minimized: boolean;
}

export const isNotificationForeground = ({
  visible,
  focused,
  minimized,
}: ForegroundSignals): boolean => visible && focused && !minimized;

const desktopWindow = (): DesktopBridge['window'] | undefined =>
  globalThis.window?.argo?.window;

const isForeground = (): boolean =>
  isNotificationForeground({
    visible: document.visibilityState === 'visible',
    focused: document.hasFocus(),
    minimized: desktopWindow()?.isMinimized() ?? false,
  });

function watchForeground(changed: () => void): () => void {
  window.addEventListener('focus', changed);
  window.addEventListener('blur', changed);
  document.addEventListener('visibilitychange', changed);
  const stopMinimized = desktopWindow()?.onMinimizedChange(changed);

  return () => {
    window.removeEventListener('focus', changed);
    window.removeEventListener('blur', changed);
    document.removeEventListener('visibilitychange', changed);
    stopMinimized?.();
  };
}

export const useNotificationForeground = (): boolean =>
  useSyncExternalStore(watchForeground, isForeground, () => false);
