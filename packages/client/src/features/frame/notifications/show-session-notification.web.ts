import type { DesktopBridge } from '@repo/contracts';
import type { SessionNotification } from './session-notifications';

declare global {
  interface Window {
    argo?: DesktopBridge;
  }
}

const hasDesktopWindow = (bridge: DesktopBridge | undefined): boolean =>
  typeof bridge?.window?.show === 'function';

export const supportsDesktopNotifications = (): boolean =>
  hasDesktopWindow(globalThis.window?.argo) &&
  typeof Notification !== 'undefined';

const hasFocusedWindow = (): boolean =>
  document.visibilityState === 'visible' && document.hasFocus();

const canDeliver = (): boolean =>
  !hasFocusedWindow() && Notification.permission !== 'denied';

const createNativeNotification = (notice: SessionNotification): Notification =>
  new Notification(notice.session.title ?? 'Session', {
    body: notice.body,
    tag: notice.session.sessionId,
  });

export function showSessionNotification(
  notice: SessionNotification | null,
  open: (id: string) => void,
): void {
  if (!notice || !canDeliver()) return;

  const notification = createNativeNotification(notice);

  notification.onclick = (): void => {
    window.argo?.window.show();
    open(notice.session.sessionId);
    notification.close();
  };
}
