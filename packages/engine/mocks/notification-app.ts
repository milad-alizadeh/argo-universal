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
import { AppPageSocket } from './app-socket';

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
  const socket = createWSClient({
    url: url.replace('http:', 'ws:'),
    WebSocket: AppPageSocket,
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const observation = notificationObservation();
  const subscription = subscribeNotifications(client, deliver, observation);

  return notificationApp({ client, observation }, { socket, subscription });
}

type Subscription = ReturnType<
  TRPCClient<AppRouter>['notifications']['events']['subscribe']
>;

type Connection = {
  socket: ReturnType<typeof createWSClient>;
  subscription: Subscription;
};

type AppContext = { client: TRPCClient<AppRouter>; observation: Observation };

const notificationApp = (
  context: AppContext,
  connection: Connection,
): NotificationApp => {
  const close = closeNotification(connection);
  onTestFinished(close);

  return {
    client: context.client,
    notifications: context.observation.notifications,
    handshakes: context.observation.handshakes,
    ready: context.observation.ready.promise,
    close,
    stop: (): void => connection.subscription.unsubscribe(),
  };
};

const closeNotification =
  (connection: Connection): (() => Promise<void>) =>
  async () => {
    connection.subscription.unsubscribe();
    await connection.socket.close();
  };

type Observation = {
  notifications: NotificationEvent[];
  handshakes: Ready[];
  ready: PromiseWithResolvers<Ready>;
};

const notificationObservation = (): Observation => ({
  notifications: [],
  handshakes: [],
  ready: Promise.withResolvers<Ready>(),
});

const subscribeNotifications = (
  client: TRPCClient<AppRouter>,
  deliver: boolean,
  observation: Observation,
): ReturnType<TRPCClient<AppRouter>['notifications']['events']['subscribe']> =>
  client.notifications.events.subscribe(
    { deliver },
    {
      onData: (event) => observeNotification(observation, event),
      onError: (error) => observation.ready.reject(error),
    },
  );

const observeNotification = (
  observation: Observation,
  event: NotificationStreamEvent,
): void => {
  if (event.type === 'ready') {
    observation.handshakes.push(event);
    observation.ready.resolve(event);
  } else observation.notifications.push(event.notification);
};
