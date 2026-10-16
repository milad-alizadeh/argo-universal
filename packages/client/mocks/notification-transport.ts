import type { AppRouter } from '@repo/engine/router';
import {
  createTRPCClient,
  createWSClient,
  loggerLink,
  wsLink,
  type LoggerLinkOptions,
} from '@trpc/client';
import { onTestFinished } from 'vitest';

type NotificationLog = NonNullable<LoggerLinkOptions<AppRouter>['logger']>;

export function openNotificationTransport(
  url: string,
  observe: NotificationLog = (): void => {},
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const socket = createWSClient({ url: url.replace('http:', 'ws:') });
  onTestFinished(() => socket.close());

  return createTRPCClient<AppRouter>({
    links: [responseLog(observe), wsLink({ client: socket })],
  });
}

function responseLog(
  observe: NotificationLog,
): ReturnType<typeof loggerLink<AppRouter>> {
  return loggerLink({
    enabled: (event) => event.direction === 'down',
    logger: observe,
  });
}
