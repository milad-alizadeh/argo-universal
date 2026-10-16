import type { NotificationEvent } from '@repo/contracts';

export const supportsDesktopNotifications = (): boolean => false;

export function showDesktopNotification(
  _event: NotificationEvent,
  _open: (id: string) => void,
): boolean {
  return false;
}
