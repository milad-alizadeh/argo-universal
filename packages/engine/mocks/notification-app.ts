import type {
  NotificationStreamEvent,
  NotificationEvent,
} from '@repo/contracts';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';

type Ready = Extract<NotificationStreamEvent, { type: 'ready' }>;

export interface NotificationApp {
  client: TRPCClient<AppRouter>;
  notifications: NotificationEvent[];
  handshakes: Ready[];
  ready: Promise<Ready>;
  close: () => Promise<void>;
  stop: () => void;
}

export function connectNotificationApp(
  url: string,
  deliver = true,
): NotificationApp {
  const socket = createWSClient({ url: url.replace('http:', 'ws:') });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const notifications: NotificationEvent[] = [];
  const ready = Promise.withResolvers<Ready>();
  const handshakes: Ready[] = [];

  const subscription = client.notifications.events.subscribe(
    { deliver },
    {
      onData: (event) => {
        if (event.type === 'ready') {
          handshakes.push(event);
          ready.resolve(event);
        } else notifications.push(event.notification);
      },
      onError: (error) => ready.reject(error),
    },
  );

  const close = async (): Promise<void> => {
    subscription.unsubscribe();
    await socket.close();
  };

  onTestFinished(close);

  return {
    client,
    notifications,
    handshakes,
    ready: ready.promise,
    close,
    stop: (): void => subscription.unsubscribe(),
  };
}
