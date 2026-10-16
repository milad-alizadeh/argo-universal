import {
  startEngineTestHost,
  seedNotificationHistory,
  movingSessionId,
} from '@repo/engine/mocks';
import { expect, it, onTestFinished } from 'vitest';
import { openNotificationTransport } from '../../../../mocks/notification-transport';
import { readNotificationBaselines } from './notification-feed';
import { NotificationReader } from './notification-reader';
import type { SessionNotification } from './session-notifications';

it('inventories archived Sessions without Feed reads and rebases history on restore', async () => {
  const host = await startEngineTestHost();
  seedNotificationHistory(host.database);
  await host.caller.session.archive({ sessionId: movingSessionId });
  const feedReads: unknown[] = [];

  const client = openNotificationTransport(host.url, (event) => {
    if (event.path === 'feed.page') feedReads.push(event.input);
  });

  const baseline = await readNotificationBaselines(client);
  expect(baseline).toHaveLength(51);
  expect(feedReads).not.toContainEqual({
    sessionId: movingSessionId,
    direction: 'tail',
    limit: 1,
  });
  await client.session.unarchive.mutate({ sessionId: movingSessionId });
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
  await expect
    .poll(() => feedReads)
    .toContainEqual({
      sessionId: movingSessionId,
      direction: 'tail',
      limit: 1,
    });
  expect(notices).toEqual([]);
  await client.session.prompt.mutate({
    sessionId: movingSessionId,
    prompt: [{ type: 'text', text: 'A later Turn still notifies' }],
  });
  await expect
    .poll(() => notices.map((notice) => notice.body))
    .toEqual(['Turn ended']);
});
