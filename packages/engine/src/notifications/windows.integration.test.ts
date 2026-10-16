import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startEngineTestHost } from '#mocks/engine';
import { connectNotificationApp } from '#mocks/notification-app';

it('closing one window preserves another window’s attention on the same Server', async () => {
  const host = await startEngineTestHost();
  const first = connectNotificationApp(host.url, false);
  const second = connectNotificationApp(host.url, false);
  const receiving = connectNotificationApp(host.url);
  await Promise.all([first.ready, second.ready, receiving.ready]);
  await first.client.notifications.attention.mutate({ sessionId: 'session-1' });
  await second.client.notifications.attention.mutate({
    sessionId: 'session-1',
  });
  await first.close();
  await receiving.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Still viewed in the other window' }],
  });
  await waitFor(host.openSessions, (snapshot) =>
    Object.values(snapshot.context.sessions).every(
      (actor) => actor.getSnapshot().context.activeTurnId === null,
    ),
  );
  await expect
    .poll(() => host.databaseWriter.getSnapshot().context.queue.length)
    .toBe(0);
  expect(receiving.notifications).toEqual([]);
  await second.client.notifications.attention.mutate({ sessionId: null });
  await receiving.client.session.prompt.mutate({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Both windows left' }],
  });
  await expect.poll(() => receiving.notifications).toHaveLength(1);
});
