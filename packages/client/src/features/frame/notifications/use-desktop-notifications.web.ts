import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useResubscribeOnReconnect,
  useTRPC,
  useTRPCClient,
} from '#features/connection';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import {
  type NotificationClient,
  type NotificationBaseline,
  readNotificationBaselines,
} from './notification-feed';
import { NotificationReader } from './notification-reader';
import { type SessionNotification } from './session-notifications';
import {
  showSessionNotification,
  supportsDesktopNotifications,
} from './show-session-notification.web';

type Deliver = (notice: SessionNotification) => void;

function useDeliverNotification(): Deliver {
  const navigate = useNavigate();
  const open = useRef(navigate);
  useEffect(() => {
    open.current = navigate;
  }, [navigate]);

  return useCallback(
    (notice) =>
      showSessionNotification(notice, (id) => open.current(sessionHref(id))),
    [],
  );
}

function useBaselines(
  client: NotificationClient,
): UseQueryResult<NotificationBaseline[]> {
  return useQuery({
    queryKey: ['desktop-notification-baseline'],
    queryFn: () => readNotificationBaselines(client),
    enabled: supportsDesktopNotifications(),
    staleTime: Infinity,
    gcTime: 0,
  });
}

const createReader = (
  client: NotificationClient,
  baseline: NotificationBaseline[] | undefined,
  deliver: Deliver,
): NotificationReader | null =>
  baseline ? new NotificationReader(client, baseline, deliver) : null;

function useActiveReader(reader: NotificationReader | null): void {
  useEffect(() => {
    reader?.setActive(true);

    return (): void => reader?.setActive(false);
  }, [reader]);
}

function useNotificationReader(): NotificationReader | null {
  const client = useTRPCClient();
  const deliver = useDeliverNotification();
  const baseline = useBaselines(client);

  const reader = useMemo(
    () => createReader(client, baseline.data, deliver),
    [client, baseline.data, deliver],
  );

  useActiveReader(reader);

  return reader;
}

export function useDesktopNotifications(): void {
  const trpc = useTRPC();
  const reader = useNotificationReader();

  const subscription = useSubscription({
    ...trpc.session.listUpdates.subscriptionOptions(),
    enabled: reader !== null,
    onData: (update) => reader?.receive(update),
  });

  useResubscribeOnReconnect(subscription);
}
