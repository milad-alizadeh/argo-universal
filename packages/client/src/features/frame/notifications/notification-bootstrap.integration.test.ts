import type { SessionListInput } from '@repo/contracts';
import {
  startEngineTestHost,
  seedNotificationHistory,
  movingSessionId,
} from '@repo/engine/mocks';
import { expect, it, onTestFinished } from 'vitest';
import { openNotificationTransport } from '../../../../mocks/notification-transport';
import {
  readNotificationBaselines,
  type NotificationClient,
} from './notification-feed';
import { NotificationReader } from './notification-reader';
import type { SessionNotification } from './session-notifications';

it.each([
  {
    change: 'activity',
    prepare: async (): Promise<void> => {},
    activate: async (client: NotificationClient): Promise<void> => {
      await client.session.prompt.mutate({
        sessionId: movingSessionId,
        prompt: [{ type: 'text', text: 'Become active during startup' }],
      });
    },
  },
  {
    change: 'unarchive',
    prepare: async (client: NotificationClient): Promise<void> => {
      await client.session.archive.mutate({ sessionId: movingSessionId });
    },
    activate: async (client: NotificationClient): Promise<void> => {
      await client.session.unarchive.mutate({ sessionId: movingSessionId });
    },
  },
])(
  'keeps all startup baselines across $change between pages',
  async ({ prepare, activate }) => {
    const host = await startEngineTestHost();
    seedNotificationHistory(host.database);
    const firstPage = Promise.withResolvers<void>();

    const client = openNotificationTransport(host.url, (event) => {
      if (event.path === 'session.list') firstPage.resolve();
    });

    await prepare(client);
    const reading = readNotificationBaselines(client);
    await firstPage.promise;
    await activate(client);
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
  },
);

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
    const client = openNotificationTransport(host.url);

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
