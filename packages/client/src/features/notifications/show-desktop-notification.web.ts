import type { DesktopBridge, NotificationEvent } from '@repo/contracts';

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

const notificationBody = (event: NotificationEvent): string =>
  event.kind === 'turn_ended' ? 'Turn ended' : 'Needs your input';

function createNotification(event: NotificationEvent): Notification | null {
  if (Notification.permission === 'denied') return null;

  try {
    return new Notification(event.title, {
      body: notificationBody(event),
      tag: event.sessionId,
    });
  } catch {
    return null;
  }
}

export function showDesktopNotification(
  event: NotificationEvent,
  open: (id: string) => void,
): boolean {
  const notification = createNotification(event);

  if (!notification) return false;
  notification.onclick = (): void => {
    window.argo?.window.show();
    open(event.sessionId);
    notification.close();
  };

  return true;
}
