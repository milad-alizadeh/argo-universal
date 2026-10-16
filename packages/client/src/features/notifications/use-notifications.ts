import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useMemo } from 'react';
import {
  useResubscribeOnReconnect,
  useTRPC,
  useTRPCClient,
  useConnectionState,
} from '#features/connection';
import { NotificationConsumer } from './notification-consumer';
import { notificationSessionAt } from './session-at-path';
import { supportsDesktopNotifications } from './show-desktop-notification';
import { useNotificationDelivery } from './use-delivery';
import { useNotificationForeground } from './use-foreground';

function useConsumer(): NotificationConsumer {
  const client = useTRPCClient();
  const deliver = useNotificationDelivery();

  return useMemo(
    () => new NotificationConsumer(client, deliver),
    [client, deliver],
  );
}

function useConsumerLifetime(consumer: NotificationConsumer): void {
  useEffect(() => {
    consumer.start();

    return (): void => consumer.stop();
  }, [consumer]);
}

export function useNotifications(path: string): void {
  const consumer = useConsumer();
  const foreground = useNotificationForeground();
  useConsumerLifetime(consumer);
  useConnectionLifetime(consumer);
  useReportedAttention(
    consumer,
    foreground ? notificationSessionAt(path) : null,
  );
  useNotificationEvents(consumer);
}

function useConnectionLifetime(consumer: NotificationConsumer): void {
  const state = useConnectionState();
  useEffect(() => {
    if (state !== 'open') consumer.disconnected();
  }, [consumer, state]);
}

function useReportedAttention(
  consumer: NotificationConsumer,
  sessionId: string | null,
): void {
  useEffect(() => consumer.attention(sessionId), [consumer, sessionId]);
}

function useNotificationEvents(consumer: NotificationConsumer): void {
  const trpc = useTRPC();

  const subscription = useSubscription({
    ...trpc.notifications.events.subscriptionOptions({
      deliver: supportsDesktopNotifications(),
    }),
    onData: (event) => consumer.receive(event),
  });

  useResubscribeOnReconnect(subscription);
}
