import type { NotificationEvent } from '@repo/contracts';
import { useCallback, useEffect, useRef } from 'react';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import { showDesktopNotification } from './show-desktop-notification';

export function useNotificationDelivery(): (
  event: NotificationEvent,
) => boolean {
  const navigate = useNavigate();
  const open = useRef(navigate);
  useEffect(() => {
    open.current = navigate;
  }, [navigate]);

  return useCallback(
    (event) =>
      showDesktopNotification(event, (id) => open.current(sessionHref(id))),
    [],
  );
}
