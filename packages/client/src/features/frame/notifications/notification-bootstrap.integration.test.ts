import type { SessionListInput } from '@repo/contracts';
import {
  startEngineTestHost,
  seedNotificationHistory,
  movingSessionId,
} from '@repo/engine/mocks';
import type { AppRouter } from '@repo/engine/router';
import {
  createTRPCClient,
  createWSClient,
  loggerLink,
  wsLink,
} from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { readNotificationBaselines } from './notification-feed';
import { NotificationReader } from './notification-reader';
import type { SessionNotification } from './session-notifications';

it('keeps all startup baselines when an existing Session becomes active between pages', async () => {
  const host = await startEngineTestHost();
  seedNotificationHistory(host.database);
  const firstPage = Promise.withResolvers<void>();
  const socket = createWSClient({ url: host.url.replace('http:', 'ws:') });

  const client = createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        logger: (event) => {
          if (event.direction === 'down' && event.path === 'session.list')
            firstPage.resolve();
        },
      }),
      wsLink({ client: socket }),
    ],
  });

  onTestFinished(() => socket.close());
  const reading = readNotificationBaselines(client);
  await firstPage.promise;
  await client.session.prompt.mutate({
    sessionId: movingSessionId,
    prompt: [{ type: 'text', text: 'Become active during startup' }],
  });
  const baseline = await reading;
  expect(baseline).toHaveLength(51);
  expect(
    baseline.some((entry) => entry.session.sessionId === movingSessionId),
  ).toBe(true);
  const notices: SessionNotification[] = [];

  const reader = new NotificationReader(client, baseline, (notice) =>
    notices.push(notice),
  );

  reader.setActive(true);

  const updates = client.session.listUpdates.subscribe(undefined, {
    onData: (update) => reader.receive(update),
  });

  onTestFinished(() => {
    reader.setActive(false);
    updates.unsubscribe();
  });
  await client.session.prompt.mutate({
    sessionId: movingSessionId,
    prompt: [{ type: 'text', text: 'A later Turn still notifies' }],
  });
  await expect
    .poll(() => notices.map((notice) => notice.body))
    .toEqual(['Turn ended']);
});

it.each<{
  order: SessionListInput['order'];
  other: SessionListInput['order'];
}>([
  { order: 'created', other: 'activity' },
  { order: 'activity', other: 'created' },
])(
  'rejects a $order cursor used with $other ordering',
  async ({ order, other }) => {
    const host = await startEngineTestHost();
    seedNotificationHistory(host.database);
    const socket = createWSClient({ url: host.url.replace('http:', 'ws:') });

    const client = createTRPCClient<AppRouter>({
      links: [wsLink({ client: socket })],
    });

    onTestFinished(() => socket.close());

    const first = await client.session.list.query({
      archived: false,
      order,
    });

    expect(first.nextCursor).not.toBeNull();
    await expect(
      client.session.list.query({
        archived: false,
        order: other,
        cursor: first.nextCursor ?? undefined,
      }),
    ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  },
);
