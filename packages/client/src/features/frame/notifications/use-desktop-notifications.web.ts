import { useSubscription } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import { createSessionNotifications } from './session-notifications';
import {
  showSessionNotification,
  supportsDesktopNotifications,
} from './show-session-notification.web';

export function useDesktopNotifications(): void {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const [notifications] = useState(createSessionNotifications);

  const subscription = useSubscription({
    ...trpc.session.listUpdates.subscriptionOptions(),
    enabled: supportsDesktopNotifications(),
    onStarted: notifications.reset,
    onData: (update) =>
      showSessionNotification(notifications.receive(update), (id) =>
        navigate(sessionHref(id)),
      ),
  });

  useResubscribeOnReconnect(subscription);
}
